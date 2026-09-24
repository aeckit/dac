import { render } from 'solid-js/web';
import { createSignal, onMount, Show } from 'solid-js';
import { DacProvider, DacCanvas, DacInspector, DacToolbar, DacZoomControls } from '@aeckit/dac-solid';

declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
};

try {
  const vscode = acquireVsCodeApi();

  function App() {
    const [doc, setDoc] = createSignal<any>(null);
    const [nestedDocs, setNestedDocs] = createSignal<Map<string, any>>(new Map());
    const [errorMsg, setErrorMsg] = createSignal<string | null>(null);

    onMount(() => {
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = event.data;
          if (message.type === 'loadConfig') {
            const config = message.config;
            const mergedNested = new Map<string, any>();
            
            if (message.viewportsMap) {
              Object.entries(message.viewportsMap).forEach(([k, v]) => mergedNested.set(k, v));
            }
            if (message.titleBlockMap) {
              Object.entries(message.titleBlockMap).forEach(([k, v]) => mergedNested.set(k, v));
            }
            if (message.constructsMap) {
              Object.entries(message.constructsMap).forEach(([k, v]) => mergedNested.set(k, v));
            }
            
            setDoc(config);
            setNestedDocs(mergedNested);
            setErrorMsg(null);
          } else if (message.type === 'error') {
            setErrorMsg(message.message);
          }
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.stack || err.message : String(err));
        }
      };

      window.addEventListener('message', handleMessage);
      vscode.postMessage({ type: 'ready' });

      return () => {
        window.removeEventListener('message', handleMessage);
      };
    });

    const handleDocChange = (newDoc: any, updatedNestedDocs?: Map<string, any>, isTransient?: boolean) => {
      if (!isTransient) {
        setDoc(newDoc);
        vscode.postMessage({ type: 'updateConfig', config: newDoc });
      }
    };

    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc', color: '#000' }}>
        <Show when={errorMsg()}>
          <div style={{ color: 'red', padding: '20px', fontFamily: 'monospace' }}>
            <h3>Error</h3>
            <pre>{errorMsg()}</pre>
          </div>
        </Show>
        
        <Show when={doc() && !errorMsg()}>
          <DacProvider 
            doc={doc()} 
            nestedDocs={nestedDocs()}
            onChange={handleDocChange}
          >
            {/* Layer 0: Full-Bleed Canvas */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <DacCanvas />
            </div>

            {/* Layer 1: Floating UI Overlay */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '0' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px', pointerEvents: 'auto' }}>
                    <DacToolbar />
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginLeft: '16px', marginBottom: '16px', pointerEvents: 'auto' }}>
                    <DacZoomControls />
                  </div>
                </div>
                
                <div class="left-panel" style={{ pointerEvents: 'auto', width: '350px', display: 'flex', flexDirection: 'column', background: '#ffffff', boxShadow: '-4px 0 12px rgba(0,0,0,0.05)', borderLeft: '1px solid #e2e8f0', zIndex: 20 }}>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <DacInspector />
                  </div>
                </div>
              </div>
            </div>
          </DacProvider>
        </Show>
      </div>
    );
  }

  const rootElement = document.getElementById('root');
  if (rootElement) {
    render(() => <App />, rootElement);
  }
} catch (err) {
  document.body.innerHTML = `<div style="color:red; padding: 20px; font-family: monospace;"><h3>Webview Init Error</h3><pre>${err instanceof Error ? err.stack : String(err)}</pre></div>`;
}
