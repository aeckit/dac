import { For } from 'solid-js';

export function WorkspaceSidebar(props: {
  files: Record<string, any>;
  activeFileId: string;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  return (
    <div style={{ "pointer-events": 'auto', width: '250px', "background-color": 'var(--app-bg-sidebar)', color: 'var(--app-text)', border: '1px solid var(--app-border)', display: 'flex', "flex-direction": 'column', margin: '72px 8px 16px 16px', "border-radius": '12px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '16px', "font-weight": 'bold', "border-bottom": '1px solid var(--app-border)' }}>
        Workspace
      </div>
      <div style={{ padding: '8px', flex: 1, "overflow-y": 'auto' }}>
        <For each={Object.keys(props.files)}>
          {(file) => (
            <div 
              style={{
                padding: '8px',
                cursor: 'pointer',
                "background-color": file === props.activeFileId ? 'var(--app-bg-panel)' : 'transparent',
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
      <div style={{ padding: '16px', "border-top": '1px solid var(--app-border)' }}>
        <button 
          onClick={() => {
            const name = prompt('File name:');
            if (name) props.onAdd(name);
          }}
          style={{ width: '100%', padding: '8px', background: 'var(--app-accent)', color: 'white', border: 'none', "border-radius": '4px', cursor: 'pointer' }}
        >
          + New File
        </button>
      </div>
    </div>
  );
}
