import { For } from 'solid-js';

export function WorkspaceSidebar(props: {
  files: Record<string, any>;
  activeFileId: string;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  return (
    <div style={{ width: '250px', "background-color": '#0f172a', color: '#f8fafc', "border-right": '1px solid #334155', display: 'flex', "flex-direction": 'column' }}>
      <div style={{ padding: '16px', "font-weight": 'bold', "border-bottom": '1px solid #334155' }}>
        Workspace
      </div>
      <div style={{ padding: '8px', flex: 1, "overflow-y": 'auto' }}>
        <For each={Object.keys(props.files)}>
          {(file) => (
            <div 
              style={{
                padding: '8px',
                cursor: 'pointer',
                "background-color": file === props.activeFileId ? '#1e293b' : 'transparent',
                "border-radius": '4px',
                display: 'flex',
                "justify-content": 'space-between',
                "margin-bottom": '4px'
              }}
            >
              <span onClick={() => props.onSelect(file)} style={{ flex: 1 }}>{file}</span>
              <button 
                onClick={() => props.onDelete(file)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', "font-size": '16px' }}
              >×</button>
            </div>
          )}
        </For>
      </div>
      <div style={{ padding: '16px', "border-top": '1px solid #334155' }}>
        <button 
          onClick={() => {
            const name = prompt('File name:');
            if (name) props.onAdd(name);
          }}
          style={{ width: '100%', padding: '8px', background: '#3b82f6', color: 'white', border: 'none', "border-radius": '4px', cursor: 'pointer' }}
        >
          + New File
        </button>
      </div>
    </div>
  );
}
