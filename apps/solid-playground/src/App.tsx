import { createSignal, Show, onCleanup } from 'solid-js';
import { DacProvider, DacCanvas, DacInspector, DacToolbar, DacZoomControls } from '@aeckit/dac-solid';
import { useWorkspace } from './hooks/useWorkspace';
import { useSettings } from './hooks/useSettings';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { DocJsonEditor } from './components/DocJsonEditor';
import { AppHeader } from './components/AppHeader';
import { SettingsInspector } from './components/SettingsInspector';
import { SettingsJsonEditor } from './components/SettingsJsonEditor';

export function App() {
  const { files, activeFileId, setActiveFileId, activeDoc, updateActiveDoc, addFile, deleteFile, shareUrl } = useWorkspace();
  const { cssVariables, activeCanvasTheme } = useSettings();
  
  const [rightPaneMode, setRightPaneMode] = createSignal<'properties' | 'settings' | 'closed'>('properties');
  const [viewMode, setViewMode] = createSignal<'rendered' | 'json'>('rendered');
  
  const [isSidebarOpen, setIsSidebarOpen] = createSignal(true);

  const handleOpenFile = (e: any) => {
    const filename = e.detail.filename;
    setActiveFileId(filename);
  };
  
  window.addEventListener('dac-open-file', handleOpenFile as EventListener);
  onCleanup(() => window.removeEventListener('dac-open-file', handleOpenFile as EventListener));

  const toggleRightPane = (mode: 'properties' | 'settings') => {
    if (rightPaneMode() === mode) {
      setRightPaneMode('closed');
    } else {
      setRightPaneMode(mode);
    }
  };

  return (
    <div style={{ ...cssVariables(), position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--cad-bg, #f8fafc)', color: 'var(--app-text)' }}>
      <DacProvider 
        doc={activeDoc()} 
        nestedDocs={new Map(Object.entries(files()))}
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
            filesList={Object.keys(files())}
            shareUrl={shareUrl}
            rightPaneMode={rightPaneMode()}
            isSidebarOpen={isSidebarOpen()}
            onOpenProperties={() => toggleRightPane('properties')}
            onOpenSettings={() => toggleRightPane('settings')} 
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
            
            <div style={{ display: 'flex', "flex-direction": 'column', flex: 1, "min-width": '0', position: 'relative' }}>
              <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', "z-index": 10 }}>
                <DacToolbar />
              </div>
              <div style={{ flex: 1 }} /> {/* Empty space letting clicks pass through to canvas */}
              <div style={{ display: 'flex', "justify-content": 'flex-start' }}>
                <DacZoomControls />
              </div>
            </div>
            
            <Show when={rightPaneMode() !== 'closed'}>
              <div style={{ "pointer-events": 'auto', width: '400px', display: 'flex', "flex-direction": 'column', background: 'var(--app-bg-sidebar)', "backdrop-filter": 'var(--app-backdrop)', margin: '72px 16px 16px 8px', "border-radius": '12px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--app-border)', overflow: 'hidden' }}>
                  <div style={{ padding: '16px', "border-bottom": '1px solid var(--app-border)', background: 'var(--app-bg-panel)', display: 'flex', "justify-content": 'space-between', "align-items": 'center' }}>
                    <h2 style={{ margin: 0, "font-size": '16px' }}>{rightPaneMode() === 'properties' ? 'Properties' : 'App Settings'}</h2>
                    {/* Form vs JSON Toggle */}
                    <div style={{ display: 'flex', background: 'var(--app-bg-sidebar)', "border-radius": '6px', overflow: 'hidden', border: '1px solid var(--app-border)' }}>
                      <button 
                        onClick={() => setViewMode('rendered')}
                        style={{ padding: '4px 12px', background: viewMode() === 'rendered' ? 'var(--app-btn-bg)' : 'transparent', color: viewMode() === 'rendered' ? 'var(--app-btn-text)' : 'var(--app-text-muted)', border: 'none', "font-size": '12px', cursor: 'pointer', "font-weight": viewMode() === 'rendered' ? 'bold' : 'normal' }}
                      >
                        Form
                      </button>
                      <button 
                        onClick={() => setViewMode('json')}
                        style={{ padding: '4px 12px', background: viewMode() === 'json' ? 'var(--app-btn-bg)' : 'transparent', color: viewMode() === 'json' ? 'var(--app-btn-text)' : 'var(--app-text-muted)', border: 'none', "font-size": '12px', cursor: 'pointer', "font-weight": viewMode() === 'json' ? 'bold' : 'normal' }}
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', "flex-direction": 'column', "min-height": '0', "overflow-y": 'auto' }}>
                    <Show when={rightPaneMode() === 'properties'}>
                      <Show when={viewMode() === 'rendered'}>
                        <DacInspector />
                      </Show>
                      <Show when={viewMode() === 'json'}>
                        <DocJsonEditor />
                      </Show>
                    </Show>
                    <Show when={rightPaneMode() === 'settings'}>
                      <Show when={viewMode() === 'rendered'}>
                        <SettingsInspector />
                      </Show>
                      <Show when={viewMode() === 'json'}>
                        <SettingsJsonEditor />
                      </Show>
                    </Show>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </DacProvider>
    </div>
  );
}
