import { createSignal, Show } from 'solid-js';
import { DacProvider, DacCanvas, DacInspector, DacToolbar, DacZoomControls } from '@aeckit/dac-solid';
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
  const [isSidebarOpen, setIsSidebarOpen] = createSignal(true);

  return (
    <div style={{ ...cssVariables(), position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--cad-bg, #f8fafc)', color: 'var(--app-text)' }}>
      <DacProvider 
        doc={activeDoc()} 
        onChange={(newDoc) => updateActiveDoc(newDoc)}
        canvasTheme={activeCanvasTheme()}
      >
        {/* Layer 0: Full-Bleed Canvas */}
        <div style={{ position: 'absolute', inset: 0, "z-index": 0 }}>
          <DacCanvas />
        </div>

        {/* Layer 1: Floating UI Overlay */}
        <div style={{ position: 'absolute', inset: 0, "z-index": 10, "pointer-events": 'none', display: 'flex', "flex-direction": 'column' }}>
          <AppHeader 
            activeFileId={activeFileId()} 
            shareUrl={shareUrl} 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen())}
          />
          
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <Show when={isSidebarOpen()}>
              <WorkspaceSidebar 
                files={files()} 
                activeFileId={activeFileId()} 
                onSelect={setActiveFileId} 
                onAdd={addFile} 
                onDelete={deleteFile} 
              />
            </Show>
            
            <div style={{ display: 'flex', "flex-direction": 'column', flex: 1, "min-width": '0' }}>
              <div style={{ display: 'flex', "justify-content": 'center' }}>
                <DacToolbar />
              </div>
              <div style={{ flex: 1 }} /> {/* Empty space letting clicks pass through to canvas */}
              <div style={{ display: 'flex', "justify-content": 'flex-start' }}>
                <DacZoomControls />
              </div>
            </div>
            
            <div style={{ "pointer-events": 'auto', width: '400px', display: 'flex', "flex-direction": 'column', background: 'var(--app-bg-sidebar)', "backdrop-filter": 'var(--app-backdrop)', margin: '72px 16px 16px 8px', "border-radius": '12px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--app-border)', overflow: 'hidden' }}>
                <div style={{ padding: '16px', "border-bottom": '1px solid var(--app-border)', background: 'var(--app-bg-panel)', display: 'flex', "justify-content": 'space-between', "align-items": 'center' }}>
                  <h3 style={{ margin: 0, "font-size": '14px', "text-transform": 'uppercase', color: 'var(--app-text-muted)' }}>Document</h3>
                  
                  {/* Document Form vs JSON Toggle */}
                  <div style={{ display: 'flex', background: 'var(--app-bg-sidebar)', "border-radius": '6px', overflow: 'hidden', border: '1px solid var(--app-border)' }}>
                     <button 
                      onClick={() => setDocumentViewMode('rendered')}
                      style={{ padding: '4px 12px', background: documentViewMode() === 'rendered' ? 'var(--app-btn-bg)' : 'transparent', color: documentViewMode() === 'rendered' ? 'var(--app-btn-text)' : 'var(--app-text-muted)', border: 'none', "font-size": '12px', cursor: 'pointer', "font-weight": documentViewMode() === 'rendered' ? 'bold' : 'normal' }}
                    >
                      Form
                    </button>
                    <button 
                      onClick={() => setDocumentViewMode('json')}
                      style={{ padding: '4px 12px', background: documentViewMode() === 'json' ? 'var(--app-btn-bg)' : 'transparent', color: documentViewMode() === 'json' ? 'var(--app-btn-text)' : 'var(--app-text-muted)', border: 'none', "font-size": '12px', cursor: 'pointer', "font-weight": documentViewMode() === 'json' ? 'bold' : 'normal' }}
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
          </div>
        </div>
      </DacProvider>

      <SettingsModal isOpen={isSettingsOpen()} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
