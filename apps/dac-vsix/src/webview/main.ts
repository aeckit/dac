import { VisualizerUI } from '@aeckit/ui-components';

// Declare VS Code webview API access
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
};

try {
  const vscode = acquireVsCodeApi();
  const rootElement = document.getElementById('root');

  if (rootElement) {
    let uiInstance: VisualizerUI | null = null;

    window.addEventListener('message', (event) => {
      try {
        const message = event.data;
        if (message.type === 'loadConfig') {
          const config = message.config;
          const viewportsMap = message.viewportsMap ? new Map(Object.entries(message.viewportsMap)) : new Map();
          const titleBlockMap = message.titleBlockMap ? new Map(Object.entries(message.titleBlockMap)) : new Map();

          if (!uiInstance) {
            uiInstance = new VisualizerUI(rootElement, config, (newConfig) => {
              vscode.postMessage({ type: 'updateConfig', config: newConfig });
            }, viewportsMap, titleBlockMap);
          } else {
            uiInstance.updateConfig(config, viewportsMap, titleBlockMap);
          }
        }
      } catch (err) {
        rootElement.innerHTML = `<div style="color:red; padding: 20px; font-family: monospace;"><h3>Webview Message Error</h3><pre>${err instanceof Error ? err.stack : String(err)}</pre></div>`;
      }
    });

    vscode.postMessage({ type: 'ready' });
  }
} catch (err) {
  document.body.innerHTML = `<div style="color:red; padding: 20px; font-family: monospace;"><h3>Webview Init Error</h3><pre>${err instanceof Error ? err.stack : String(err)}</pre></div>`;
}
