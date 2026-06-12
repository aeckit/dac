import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DetailDocument } from '@aeckit/core-solver';

export function activate(context: vscode.ExtensionContext) {
  console.log('DAC Visualizer Extension is active!');

  let activePanel: vscode.WebviewPanel | undefined = undefined;
  let activeDocument: vscode.TextDocument | undefined = undefined;
  let lastWebviewDoc: DetailDocument | null = null;
  let isWebviewUpdating = false;

  // Helper to parse the JSON drawing document
  function parseDocument(document: vscode.TextDocument): DetailDocument | null {
    const text = document.getText();
    try {
      const doc = JSON.parse(text) as DetailDocument;
      // Basic validation to check it contains parameters and geometry
      if (doc && typeof doc === 'object' && doc.parameters && doc.geometry) {
        return doc;
      }
      return null;
    } catch (err) {
      console.error('Failed to parse Detail JSON:', err);
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
          const doc = parseDocument(document!);
          if (doc) {
            panel.webview.postMessage({ type: 'loadConfig', config: doc });
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
  const onSaveSubscription = vscode.workspace.onDidSaveTextDocument((document) => {
    if (activePanel && activeDocument && document.uri.toString() === activeDocument.uri.toString()) {
      const doc = parseDocument(document);
      if (doc) {
        // Prevent refresh cycles if changes originated from webview itself
        if (JSON.stringify(doc) !== JSON.stringify(lastWebviewDoc)) {
          activePanel.webview.postMessage({ type: 'loadConfig', config: doc });
        }
      }
    }
  });

  const onChangeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
    if (activePanel && activeDocument && event.document.uri.toString() === activeDocument.uri.toString()) {
      if (isWebviewUpdating) {
        isWebviewUpdating = false;
        return;
      }
      const doc = parseDocument(event.document);
      if (doc) {
        if (JSON.stringify(doc) !== JSON.stringify(lastWebviewDoc)) {
          activePanel.webview.postMessage({ type: 'loadConfig', config: doc });
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
      <link rel="stylesheet" nonce="${nonce}" href="${styleUri}">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; img-src ${webview.cspSource} data:;">
    </head>
    <body>
      <div id="root"></div>
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
