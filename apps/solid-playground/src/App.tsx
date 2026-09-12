import { DacProvider, DacCanvas, DacInspector, DacToolbar } from '@aeckit/dac-solid';
import { useWorkspace } from './hooks/useWorkspace';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { MonacoJsonEditor } from './components/MonacoJsonEditor';
import { AppHeader } from './components/AppHeader';

export function App() {
  const { files, activeFileId, setActiveFileId, activeDoc, updateActiveDoc, addFile, deleteFile, shareUrl } = useWorkspace();

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
              <DacInspector />
            </div>
          </div>
          
          <div style={{ width: '400px', "border-left": '1px solid #334155', display: 'flex', "flex-direction": 'column' }}>
            <MonacoJsonEditor />
          </div>
        </DacProvider>
      </div>
    </div>
  );
}
