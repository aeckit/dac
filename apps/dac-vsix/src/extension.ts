import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DetailDocument, ProjectDocument, SheetDocument } from '@aeckit/core-solver';

export function activate(context: vscode.ExtensionContext) {
  console.log('DAC Visualizer Extension is active!');

  let activePanel: vscode.WebviewPanel | undefined = undefined;
  let activeDocument: vscode.TextDocument | undefined = undefined;
  let lastWebviewDoc: DetailDocument | null = null;
  let isWebviewUpdating = false;

  function resolveLocalImages(doc: any, baseDir: string) {
    if (!doc || !doc.geometry || !Array.isArray(doc.geometry)) return;
    for (const geom of doc.geometry) {
      if (geom.type === 'CAD::Annotation::Image' && geom.href && typeof geom.href === 'string') {
        const href: string = geom.href;
        if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('data:')) {
          try {
            const imgPath = path.isAbsolute(href) ? href : path.resolve(baseDir, href);
            if (fs.existsSync(imgPath)) {
              const ext = path.extname(imgPath).toLowerCase().replace('.', '') || 'jpeg';
              const mime = ext === 'jpg' ? 'jpeg' : ext === 'svg' ? 'svg+xml' : ext;
              const base64 = fs.readFileSync(imgPath, 'base64');
              geom.href = `data:image/${mime};base64,${base64}`;
            }
          } catch (e) {
            console.error('Failed to load local image:', href, e);
          }
        }
      }
    }
  }

  // Helper to parse the JSON drawing document and load dependencies if it's a Project
  async function parseAndLoadDocument(document: vscode.TextDocument): Promise<{ doc: any, viewportsMap?: Record<string, any>, titleBlockMap?: Record<string, any> } | null> {
    const text = document.getText();
    try {
      const doc = JSON.parse(text);
      if (!doc || typeof doc !== 'object') return null;
      
      const baseDir = path.dirname(document.fileName);

      if (doc.type === 'CAD::Project' || doc.type === 'CAD::SheetConfiguration') {
        let ds = doc as ProjectDocument;
        
        // If a Sheet is opened directly, wrap it in a dummy Project for the visualizer
        if (doc.type === 'CAD::SheetConfiguration') {
          const c = doc as SheetDocument;
          ds = {
            type: 'CAD::Project',
            projectName: "PREVIEW PROJECT",
            projectAddress: "PREVIEW ADDRESS",
            sheets: [c]
          };
        }
        const viewportsMap: Record<string, any> = {};
        const titleBlockMap: Record<string, any> = {};
        
        // Load sheets
        for (let i = 0; i < ds.sheets.length; i++) {
          let sheet = ds.sheets[i];
          let sheetBaseDir = baseDir;
          
          if (typeof sheet === 'string') {
            try {
              const sheetPath = path.join(baseDir, sheet);
              sheetBaseDir = path.dirname(sheetPath);
              const sheetContent = fs.readFileSync(sheetPath, 'utf8');
              sheet = JSON.parse(sheetContent) as SheetDocument;
              ds.sheets[i] = sheet; // Inline it for the webview
            } catch (e) {
              console.error('Failed to load sheet:', sheet);
              continue;
            }
          }
          
          if (typeof sheet !== 'string') {
            resolveLocalImages(sheet, sheetBaseDir);
            // Load title block

            if (sheet.titleBlockOverride && typeof sheet.titleBlockOverride === "string") {
              try {
                const tbPath = path.join(sheetBaseDir, sheet.titleBlockOverride);
                const tbContent = fs.readFileSync(tbPath, "utf8");
                titleBlockMap[sheet.titleBlockOverride] = JSON.parse(tbContent);
                resolveLocalImages(titleBlockMap[sheet.titleBlockOverride], sheetBaseDir);
              } catch (e) {
                console.error("Failed to load title block:", sheet.titleBlockOverride);
              }
            }
            if (ds.defaultTitleBlockRef && typeof ds.defaultTitleBlockRef === "string") {
              try {
                const tbPath = path.join(baseDir, ds.defaultTitleBlockRef);
                const tbContent = fs.readFileSync(tbPath, "utf8");
                titleBlockMap[ds.defaultTitleBlockRef] = JSON.parse(tbContent);
                resolveLocalImages(titleBlockMap[ds.defaultTitleBlockRef], baseDir);
              } catch (e) {
                console.error("Failed to load default title block:", ds.defaultTitleBlockRef);
              }
            }

            // Load viewports
            if (sheet.viewports) {
              for (const vp of sheet.viewports) {
                if (typeof vp.detail === 'string' && !viewportsMap[vp.detail]) {
                  try {
                    const vpPath = path.join(sheetBaseDir, vp.detail);
                    const vpContent = fs.readFileSync(vpPath, 'utf8');
                    viewportsMap[vp.detail] = JSON.parse(vpContent);
                    resolveLocalImages(viewportsMap[vp.detail], sheetBaseDir);
                  } catch (e) {
                    console.error('Failed to load viewport detail:', vp.detail);
                  }
                }
              }
            }
          }
        }
        return { doc: ds, viewportsMap, titleBlockMap };
      } else if (doc.parameters && doc.geometry) {
        resolveLocalImages(doc, baseDir);
        return { doc };
      }
      return null;
    } catch (err) {
      console.error('Failed to parse JSON:', err);
      return null;
    }
  }

  // Register command to open visualizer
  const openVisualizerCommand = vscode.commands.registerCommand(
    'dac.openPreview',
    async (uri: vscode.Uri) => {
      let document: vscode.TextDocument | undefined = undefined;
      if (uri) {
        document = await vscode.workspace.openTextDocument(uri);
      } else {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
          document = activeEditor.document;
        }
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

      activeDocument = document;

      // Create Webview Panel next to current editor
      const panel = vscode.window.createWebviewPanel(
        'structuralDetailVisualizer',
        `DAC Preview: ${path.basename(document.fileName)}`,
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'dist'))]
        }
      );

      activePanel = panel;

      // Load HTML template
      panel.webview.html = getWebviewHtml(panel.webview, context);

      // Listen to messages from Webview
      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.type === 'ready') {
          const data = await parseAndLoadDocument(document!);
          if (data) {
            panel.webview.postMessage({ type: 'loadConfig', config: data.doc, viewportsMap: data.viewportsMap, titleBlockMap: data.titleBlockMap });
          }
        } else if (message.type === 'updateConfig') {
          const updatedDoc = message.config as DetailDocument;
          lastWebviewDoc = updatedDoc;

          if (document) {
            isWebviewUpdating = true;
            // Apply workspace edit to update active JSON document in editor buffer
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
              document.positionAt(0),
              document.positionAt(document.getText().length)
            );
            edit.replace(
              document.uri,
              fullRange,
              JSON.stringify(updatedDoc, null, 2)
            );
            try {
              const success = await vscode.workspace.applyEdit(edit);
              if (!success) {
                isWebviewUpdating = false;
              }
            } catch (err) {
              isWebviewUpdating = false;
              console.error('Failed to apply workspace edit from webview:', err);
            }
          }
        }
      });

      // Handle panel disposal
      panel.onDidDispose(() => {
        if (activePanel === panel) {
          activePanel = undefined;
          activeDocument = undefined;
        }
      });
    }
  );

  context.subscriptions.push(openVisualizerCommand);
  // File watcher: updates visualizer on editor changes/saves
  const onSaveSubscription = vscode.workspace.onDidSaveTextDocument(async (document) => {
    if (activePanel && activeDocument && document.uri.toString() === activeDocument.uri.toString()) {
      const data = await parseAndLoadDocument(document);
      if (data) {
        // Prevent refresh cycles if changes originated from webview itself
        if (JSON.stringify(data.doc) !== JSON.stringify(lastWebviewDoc)) {
          activePanel.webview.postMessage({ type: 'loadConfig', config: data.doc, viewportsMap: data.viewportsMap, titleBlockMap: data.titleBlockMap });
        }
      }
    }
  });

  const onChangeSubscription = vscode.workspace.onDidChangeTextDocument(async (event) => {
    if (activePanel && activeDocument && event.document.uri.toString() === activeDocument.uri.toString()) {
      if (isWebviewUpdating) {
        isWebviewUpdating = false;
        return;
      }
      const data = await parseAndLoadDocument(event.document);
      if (data) {
        if (JSON.stringify(data.doc) !== JSON.stringify(lastWebviewDoc)) {
          activePanel.webview.postMessage({ type: 'loadConfig', config: data.doc, viewportsMap: data.viewportsMap, titleBlockMap: data.titleBlockMap });
        }
      }
    }
  });

  context.subscriptions.push(onSaveSubscription);
  context.subscriptions.push(onChangeSubscription);
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
