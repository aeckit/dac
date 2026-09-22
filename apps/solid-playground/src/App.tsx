import { createSignal, Show } from 'solid-js';
import { DacProvider, DacCanvas, DacInspector, DacToolbar } from '@aeckit/dac-solid';
import { useWorkspace } from './hooks/useWorkspace';
import { useSettings } from './hooks/useSettings';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { DocJsonEditor } from './components/DocJsonEditor';
import { AppHeader } from './components/AppHeader';
import { SettingsModal } from './components/SettingsModal';

export function App() {
  const { files, activeFileId, setActiveFileId, activeDoc, updateActiveDoc, addFile, deleteFile, shareUrl } = useWorkspace();
  const { cssVariables, activeCanvasTheme } = useSettings();
  
  const [documentViewMode, setDocumentViewMode] = createSignal<'rendered' | 'json'>('rendered');
  const [isSettingsOpen, setIsSettingsOpen] = createSignal(false);

  return (
    <div style={{ ...cssVariables(), display: 'flex', "flex-direction": 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--app-bg-main)', color: 'var(--app-text)' }}>
      <AppHeader activeFileId={activeFileId()} shareUrl={shareUrl} onOpenSettings={() => setIsSettingsOpen(true)} />
      
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
            <div style={{ padding: '16px', "border-bottom": '1px solid var(--app-border)', background: 'var(--app-bg-panel)', display: 'flex', "justify-content": 'space-between', "align-items": 'center' }}>
              <h3 style={{ margin: 0, "font-size": '14px', "text-transform": 'uppercase', color: 'var(--app-text-muted)' }}>Document</h3>
              
              {/* Document GUI vs JSON Toggle */}
              <div style={{ display: 'flex', background: 'var(--app-bg-sidebar)', "border-radius": '6px', overflow: 'hidden', border: '1px solid var(--app-border)' }}>
                 <button 
                  onClick={() => setDocumentViewMode('rendered')}
                  style={{ padding: '4px 12px', background: documentViewMode() === 'rendered' ? 'var(--app-btn-bg)' : 'transparent', color: documentViewMode() === 'rendered' ? 'var(--app-btn-text)' : 'var(--app-text-muted)', border: 'none', "font-size": '12px', cursor: 'pointer' }}
                >
                  GUI
                </button>
                <button 
                  onClick={() => setDocumentViewMode('json')}
                  style={{ padding: '4px 12px', background: documentViewMode() === 'json' ? 'var(--app-btn-bg)' : 'transparent', color: documentViewMode() === 'json' ? 'var(--app-btn-text)' : 'var(--app-text-muted)', border: 'none', "font-size": '12px', cursor: 'pointer' }}
                >
                  JSON
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', "flex-direction": 'column', "min-height": '0', "overflow-y": 'auto' }}>
              <Show when={documentViewMode() === 'rendered'}>
                <DacInspector />
              </Show>
              <Show when={documentViewMode() === 'json'}>
                <DocJsonEditor />
              </Show>
            </div>
          </div>
        </DacProvider>
      </div>

      <SettingsModal isOpen={isSettingsOpen()} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
