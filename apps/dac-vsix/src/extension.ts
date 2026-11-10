import * as vscode from 'vscode';
import * as path from 'path';
import type { DetailDocument } from '@aeckit/dac-schema';
import {
  ConstructResolverHost,
  resolveConstructFilePath,
} from './constructResolver';
import { parseAndLoadDacDocument, resolveDacPath } from './documentLoader';

interface PanelState {
  panel: vscode.WebviewPanel;
  document: vscode.TextDocument;
  lastWebviewDoc: DetailDocument | null;
  lastNestedSnapshot: string;
  isWebviewUpdating: boolean;
  resolvedConstructPaths: Set<string>;
  refreshTimer?: ReturnType<typeof setTimeout>;
}

function getWorkspaceRoots(): string[] {
  return (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri.fsPath);
}

function createResolverHost(): ConstructResolverHost {
  return {
    workspaceRoots: getWorkspaceRoots(),
    findFiles: async (baseDir, globPattern, excludeSegments) => {
      const exclude = `{${excludeSegments.map((s) => `**/${s}/**`).join(',')}}`;
      const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(vscode.Uri.file(baseDir), globPattern),
        exclude
      );
      return uris.map((u) => u.fsPath);
    },
  };
}

function isConstructPath(filePath: string): boolean {
  const posix = filePath.split(path.sep).join('/');
  return (posix.includes('/constructs/') || posix.startsWith('constructs/')) && posix.endsWith('.json');
}

function isPathRelevantToPanel(filePath: string, state: PanelState): boolean {
  const canonical = path.resolve(filePath);
  if (state.resolvedConstructPaths.has(canonical)) return true;
  if (isConstructPath(canonical)) return true;

  const docDir = path.dirname(path.resolve(state.document.fileName));
  return canonical.endsWith('.json') && path.dirname(canonical) === docDir;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('DAC Visualizer Extension is active!');

  const openPanels = new Set<PanelState>();

  async function refreshPanel(
    state: PanelState,
    options?: { skipIfUnchanged?: boolean; forceFullLoad?: boolean; postErrorOnFail?: boolean }
  ): Promise<void> {
    const data = await parseAndLoadDacDocument(
      state.document.getText(),
      state.document.fileName,
      createResolverHost()
    );

    if (!data) {
      if (options?.postErrorOnFail) {
        state.panel.webview.postMessage({
          type: 'error',
          message: 'Failed to parse document or unrecognized DAC format.',
        });
      }
      return;
    }

    state.resolvedConstructPaths = data.resolvedConstructPaths;
    const nextNestedSnapshot = JSON.stringify({
      v: data.viewportsMap,
      t: data.titleBlockMap,
      c: data.constructsMap,
    });

    const docMatchesLastWebview =
      state.lastWebviewDoc !== null &&
      JSON.stringify(data.doc) === JSON.stringify(state.lastWebviewDoc);
    const nestedMatchesLast = nextNestedSnapshot === state.lastNestedSnapshot;

    if (options?.skipIfUnchanged && docMatchesLastWebview && nestedMatchesLast) {
      return;
    }

    state.lastNestedSnapshot = nextNestedSnapshot;

    if (docMatchesLastWebview && !options?.forceFullLoad) {
      state.panel.webview.postMessage({
        type: 'updateNestedDocs',
        viewportsMap: data.viewportsMap,
        titleBlockMap: data.titleBlockMap,
        constructsMap: data.constructsMap,
      });
    } else {
      state.panel.webview.postMessage({
        type: 'loadConfig',
        config: data.doc,
        viewportsMap: data.viewportsMap,
        titleBlockMap: data.titleBlockMap,
        constructsMap: data.constructsMap,
      });
    }
  }

  function scheduleRefreshPanel(state: PanelState, options?: { skipIfUnchanged?: boolean }): void {
    if (state.refreshTimer) {
      clearTimeout(state.refreshTimer);
    }
    state.refreshTimer = setTimeout(() => {
      state.refreshTimer = undefined;
      void refreshPanel(state, options);
    }, 50);
  }

  function scheduleRefreshAllPanels(): void {
    for (const state of openPanels) {
      scheduleRefreshPanel(state, { skipIfUnchanged: true });
    }
  }

  const openVisualizerCommand = vscode.commands.registerCommand(
    'dac.openPreview',
    async (uri?: vscode.Uri) => {
      let document: vscode.TextDocument | undefined;
      if (uri) {
        document = await vscode.workspace.openTextDocument(uri);
      } else {
        document = vscode.window.activeTextEditor?.document;
      }

      if (!document) {
        vscode.window.showErrorMessage('No active file found to visualize.');
        return;
      }

      const fileExt = path.extname(document.fileName).toLowerCase();
      if (fileExt !== '.json') {
        vscode.window.showErrorMessage('Only .json drawings-as-code files are supported.');
        return;
      }

      const panel = vscode.window.createWebviewPanel(
        'structuralDetailVisualizer',
        `DAC Preview: ${path.basename(document.fileName)}`,
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'dist'))],
        }
      );

      const state: PanelState = {
        panel,
        document,
        lastWebviewDoc: null,
        lastNestedSnapshot: '',
        isWebviewUpdating: false,
        resolvedConstructPaths: new Set<string>(),
      };
      openPanels.add(state);

      panel.webview.html = getWebviewHtml(panel.webview, context);

      const messageDisposable = panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'ready') {
          await refreshPanel(state, { forceFullLoad: true, postErrorOnFail: true });
        } else if (message.type === 'updateConfig') {
          const updatedDoc = message.config as DetailDocument;
          state.lastWebviewDoc = updatedDoc;
          state.isWebviewUpdating = true;

          const edit = new vscode.WorkspaceEdit();
          const fullRange = new vscode.Range(
            state.document.positionAt(0),
            state.document.positionAt(state.document.getText().length)
          );
          edit.replace(
            state.document.uri,
            fullRange,
            JSON.stringify(updatedDoc, null, 2)
          );
          try {
            const success = await vscode.workspace.applyEdit(edit);
            if (!success) {
              state.isWebviewUpdating = false;
            }
          } catch (err) {
            state.isWebviewUpdating = false;
            console.error('Failed to apply workspace edit from webview:', err);
          }
        } else if (message.type === 'openFile') {
          const baseDir = path.dirname(state.document.fileName);
          const resolvedPath =
            resolveDacPath(message.filename, baseDir, getWorkspaceRoots()) ??
            (await resolveConstructFilePath(message.filename, baseDir, createResolverHost()));

          if (resolvedPath) {
            const targetUri = vscode.Uri.file(resolvedPath);
            vscode.workspace.openTextDocument(targetUri).then(
              (doc) => {
                vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.One, preview: false });
              },
              (err) => {
                vscode.window.showErrorMessage(`Could not open file: ${err.message}`);
              }
            );
          } else {
            vscode.window.showErrorMessage(`File not found: ${message.filename}`);
          }
        }
      });

      panel.onDidDispose(() => {
        if (state.refreshTimer) {
          clearTimeout(state.refreshTimer);
        }
        messageDisposable.dispose();
        openPanels.delete(state);
      });
    }
  );

  // Watch constructs/** across workspace for create/change/delete events
  const constructWatcher = vscode.workspace.createFileSystemWatcher('**/constructs/**/*.json');
  const onConstructCreate = constructWatcher.onDidCreate(() => scheduleRefreshAllPanels());
  const onConstructChange = constructWatcher.onDidChange(() => scheduleRefreshAllPanels());
  const onConstructDelete = constructWatcher.onDidDelete(() => scheduleRefreshAllPanels());

  // Refresh open panels when the active document or any referenced construct is saved
  const onSaveSubscription = vscode.workspace.onDidSaveTextDocument((savedDoc) => {
    for (const state of openPanels) {
      if (savedDoc.uri.toString() === state.document.uri.toString()) {
        scheduleRefreshPanel(state, { skipIfUnchanged: true });
      } else if (isPathRelevantToPanel(savedDoc.fileName, state)) {
        scheduleRefreshPanel(state, { skipIfUnchanged: true });
      }
    }
  });

  // Refresh when the active document buffer changes in the editor
  const onChangeSubscription = vscode.workspace.onDidChangeTextDocument(async (event) => {
    for (const state of openPanels) {
      if (event.document.uri.toString() === state.document.uri.toString()) {
        if (state.isWebviewUpdating) {
          state.isWebviewUpdating = false;
          continue;
        }
        await refreshPanel(state, { skipIfUnchanged: true });
      }
    }
  });

  // Refresh when sibling or referenced JSON files are created/deleted/renamed via Explorer
  const handleFileListEvent = (uris: readonly vscode.Uri[]) => {
    for (const state of openPanels) {
      if (uris.some((u) => isPathRelevantToPanel(u.fsPath, state))) {
        scheduleRefreshPanel(state, { skipIfUnchanged: true });
      }
    }
  };

  const onCreateFiles = vscode.workspace.onDidCreateFiles((e) => handleFileListEvent(e.files));
  const onDeleteFiles = vscode.workspace.onDidDeleteFiles((e) => handleFileListEvent(e.files));
  const onRenameFiles = vscode.workspace.onDidRenameFiles((e) =>
    handleFileListEvent(e.files.flatMap((f) => [f.oldUri, f.newUri]))
  );

  context.subscriptions.push(
    openVisualizerCommand,
    constructWatcher,
    onConstructCreate,
    onConstructChange,
    onConstructDelete,
    onSaveSubscription,
    onChangeSubscription,
    onCreateFiles,
    onDeleteFiles,
    onRenameFiles
  );
}

function getWebviewHtml(webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview.js'))
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.file(path.join(context.extensionPath, 'dist', 'style.css'))
  );

  const nonce = getNonce();

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DAC Visualizer</title>
      <link rel="stylesheet" href="${styleUri}">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; img-src ${webview.cspSource} data: https:;">
      <style> body { background: #000; color: #fff; margin: 0; padding: 0; } </style>
    </head>
    <body>
      <div id="root" style="width: 100vw; height: 100vh;">Loading DAC Visualizer...</div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>
  `;
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
