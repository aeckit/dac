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
    let currentConstructsMap: Record<string, any> = {};

    window.addEventListener('message', (event) => {
      try {
        const message = event.data;
        if (message.type === 'loadConfig') {
          const config = message.config;
          const viewportsMap = message.viewportsMap ? new Map(Object.entries(message.viewportsMap)) : new Map();
          const titleBlockMap = message.titleBlockMap ? new Map(Object.entries(message.titleBlockMap)) : new Map();
          currentConstructsMap = message.constructsMap ? message.constructsMap : {};

          if (!uiInstance) {
            uiInstance = new VisualizerUI(rootElement, config, (newConfig) => {
              vscode.postMessage({ type: 'updateConfig', config: newConfig });
            }, viewportsMap, titleBlockMap, {
              constructResolver: (id: string) => currentConstructsMap[id]
            });
            
            setTimeout(() => {
              const container = document.querySelector('.visualizer-container');
              const leftPanel = document.querySelector('.left-panel') as HTMLElement;
              if (container && leftPanel) {
                const resizer = document.createElement('div');
                resizer.className = 'vscode-pane-resizer';
                container.insertBefore(resizer, leftPanel.nextSibling);
                
                let isResizing = false;
                resizer.addEventListener('mousedown', (e) => {
                  e.preventDefault();
                  isResizing = true;
                  resizer.classList.add('resizing');
                  document.body.style.cursor = 'col-resize';
                });
                document.addEventListener('mousemove', (e) => {
                  if (!isResizing) return;
                  const newWidth = document.body.clientWidth - e.clientX;
                  const clamped = Math.max(200, Math.min(newWidth, document.body.clientWidth - 200));
                  leftPanel.style.width = `${clamped}px`;
                  leftPanel.style.minWidth = `${clamped}px`;
                });
                document.addEventListener('mouseup', () => {
                  if (isResizing) {
                    isResizing = false;
                    resizer.classList.remove('resizing');
                    document.body.style.cursor = '';
                  }
                });
              }
            }, 0);
          } else {
            uiInstance.updateConfig(config, viewportsMap, titleBlockMap);
          }
        } else if (message.type === 'error') {
          rootElement.innerHTML = `<div style="color:red; padding: 20px; font-family: monospace;"><h3>Document Error</h3><pre>${message.message}</pre></div>`;
        }
      } catch (err) {
        rootElement.innerHTML = `<div style="color:red; padding: 20px; font-family: monospace;"><h3>Webview Message Error</h3><pre>${err instanceof Error ? err.stack : String(err)}</pre></div>`;
      }
    });

    window.addEventListener('dac-toggle-left-pane', () => {
      const leftPanel = document.querySelector('.left-panel') || document.getElementById('left-sidebar');
      const toggleBtn = document.getElementById('btn-toggle-left-pane');
      if (leftPanel) {
        leftPanel.classList.toggle('collapsed');
        const isCollapsed = leftPanel.classList.contains('collapsed');
        if (toggleBtn) {
          toggleBtn.classList.toggle('collapsed', isCollapsed);
          toggleBtn.title = isCollapsed ? 'Expand Drawing Inspector' : 'Collapse Drawing Inspector';
        }
      }
    });

    vscode.postMessage({ type: 'ready' });
  }
} catch (err) {
  document.body.innerHTML = `<div style="color:red; padding: 20px; font-family: monospace;"><h3>Webview Init Error</h3><pre>${err instanceof Error ? err.stack : String(err)}</pre></div>`;
}
