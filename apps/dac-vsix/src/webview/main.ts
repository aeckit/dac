import { VisualizerUI } from '@aeckit/ui-components';
import { DetailConfig } from '@aeckit/core-solver';

// Declare VS Code webview API access
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
};

const vscode = acquireVsCodeApi();

const rootElement = document.getElementById('root');

if (rootElement) {
  let uiInstance: VisualizerUI | null = null;

  // Listen to messages from VS Code Extension Host
  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'loadConfig') {
      const config = message.config as DetailConfig;
      if (!uiInstance) {
        // Instantiate the vanilla UI panel
        uiInstance = new VisualizerUI(rootElement, config, (newConfig) => {
          // Post configuration changes back to extension host
          vscode.postMessage({
            type: 'updateConfig',
            config: newConfig
          });
        });
      } else {
        // Update existing UI state
        uiInstance.updateConfig(config);
      }
    }
  });

  // Notify extension host that the Webview bundle is loaded and ready to accept data
  vscode.postMessage({ type: 'ready' });
}
