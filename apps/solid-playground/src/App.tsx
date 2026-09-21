import { createSignal, Show } from 'solid-js';
import { DacProvider, DacCanvas, DacInspector, DacToolbar } from '@aeckit/dac-solid';
import { useWorkspace } from './hooks/useWorkspace';
import { useSettings } from './hooks/useSettings';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { MonacoJsonEditor } from './components/MonacoJsonEditor';
import { AppHeader } from './components/AppHeader';
import { SettingsInspector } from './components/SettingsInspector';

export function App() {
  const { files, activeFileId, setActiveFileId, activeDoc, updateActiveDoc, addFile, deleteFile, shareUrl } = useWorkspace();
  const { cssVariables, activeCanvasTheme } = useSettings();
  const [rightPaneView, setRightPaneView] = createSignal<'properties' | 'json' | 'settings'>('properties');

  return (
    <div style={{ ...cssVariables(), display: 'flex', "flex-direction": 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--app-bg-main)', color: 'var(--app-text)' }}>
      <AppHeader activeFileId={activeFileId()} shareUrl={shareUrl} />
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <WorkspaceSidebar 
          files={files()} 
          activeFileId={activeFileId()} 
          onSelect={setActiveFileId} 
          onAdd={addFile} 
          onDelete={deleteFile} 
        />
        
        <DacProvider 
          doc={activeDoc()} 
          onChange={(newDoc) => updateActiveDoc(newDoc)}
          canvasTheme={activeCanvasTheme()}
        >
          <div style={{ display: 'flex', "flex-direction": 'column', flex: 1, "min-width": '0' }}>
            <DacToolbar />
            <div style={{ display: 'flex', flex: 1, position: 'relative', "min-height": '0' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <DacCanvas />
              </div>
            </div>
          </div>
          
          <div style={{ width: '400px', "border-left": '1px solid var(--app-border)', display: 'flex', "flex-direction": 'column', background: 'var(--app-bg-sidebar)' }}>
            <div style={{ display: 'flex', "border-bottom": '1px solid var(--app-border)', background: 'var(--app-bg-panel)' }}>
              <button 
                onClick={() => setRightPaneView('properties')}
                style={{ flex: 1, padding: '12px', background: rightPaneView() === 'properties' ? 'var(--app-bg-sidebar)' : 'transparent', color: rightPaneView() === 'properties' ? 'var(--app-accent)' : 'var(--app-text-muted)', border: 'none', "font-weight": 'bold', cursor: 'pointer' }}
              >
                Properties
              </button>
              <button 
                onClick={() => setRightPaneView('json')}
                style={{ flex: 1, padding: '12px', background: rightPaneView() === 'json' ? 'var(--app-bg-sidebar)' : 'transparent', color: rightPaneView() === 'json' ? 'var(--app-accent)' : 'var(--app-text-muted)', border: 'none', "font-weight": 'bold', cursor: 'pointer' }}
              >
                JSON
              </button>
              <button 
                onClick={() => setRightPaneView('settings')}
                style={{ flex: 1, padding: '12px', background: rightPaneView() === 'settings' ? 'var(--app-bg-sidebar)' : 'transparent', color: rightPaneView() === 'settings' ? 'var(--app-accent)' : 'var(--app-text-muted)', border: 'none', "font-weight": 'bold', cursor: 'pointer' }}
              >
                ⚙️ Settings
              </button>
            </div>
            
            <div style={{ flex: 1, display: 'flex', "flex-direction": 'column', "min-height": '0', "overflow-y": 'auto' }}>
              <Show when={rightPaneView() === 'properties'}>
                <DacInspector />
              </Show>
              <Show when={rightPaneView() === 'json'}>
                <MonacoJsonEditor />
              </Show>
              <Show when={rightPaneView() === 'settings'}>
                <SettingsInspector />
              </Show>
            </div>
          </div>
        </DacProvider>
      </div>
    </div>
  );
}
