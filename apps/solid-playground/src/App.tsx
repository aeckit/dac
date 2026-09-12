import { createSignal, Show } from 'solid-js';
import { DacProvider, DacCanvas, DacInspector, DacToolbar } from '@aeckit/dac-solid';
import { useWorkspace } from './hooks/useWorkspace';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { MonacoJsonEditor } from './components/MonacoJsonEditor';
import { AppHeader } from './components/AppHeader';

export function App() {
  const { files, activeFileId, setActiveFileId, activeDoc, updateActiveDoc, addFile, deleteFile, shareUrl } = useWorkspace();
  const [rightPaneView, setRightPaneView] = createSignal<'properties' | 'json'>('properties');

  return (
    <div style={{ display: 'flex', "flex-direction": 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
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
        >
          <div style={{ display: 'flex', "flex-direction": 'column', flex: 1, "min-width": '0' }}>
            <DacToolbar />
            <div style={{ display: 'flex', flex: 1, position: 'relative', "min-height": '0' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <DacCanvas />
              </div>
            </div>
          </div>
          
          <div style={{ width: '400px', "border-left": '1px solid #334155', display: 'flex', "flex-direction": 'column', background: '#0f172a' }}>
            <div style={{ display: 'flex', "border-bottom": '1px solid #334155', background: '#1e293b' }}>
              <button 
                onClick={() => setRightPaneView('properties')}
                style={{ flex: 1, padding: '12px', background: rightPaneView() === 'properties' ? '#0f172a' : 'transparent', color: rightPaneView() === 'properties' ? '#3b82f6' : '#94a3b8', border: 'none', "font-weight": 'bold', cursor: 'pointer' }}
              >
                Properties
              </button>
              <button 
                onClick={() => setRightPaneView('json')}
                style={{ flex: 1, padding: '12px', background: rightPaneView() === 'json' ? '#0f172a' : 'transparent', color: rightPaneView() === 'json' ? '#3b82f6' : '#94a3b8', border: 'none', "font-weight": 'bold', cursor: 'pointer' }}
              >
                JSON
              </button>
            </div>
            
            <div style={{ flex: 1, display: 'flex', "flex-direction": 'column', "min-height": '0' }}>
              <Show when={rightPaneView() === 'properties'} fallback={<MonacoJsonEditor />}>
                <DacInspector />
              </Show>
            </div>
          </div>
        </DacProvider>
      </div>
    </div>
  );
}
