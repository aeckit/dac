import { For, createSignal, createMemo, createEffect, onCleanup } from 'solid-js';

function FileIcon(props: { type: string, color: string }) {
  const iconProps = { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: props.color, "stroke-width": "2", "stroke-linecap": "round" as const, "stroke-linejoin": "round" as const };
  
  switch(props.type) {
    case 'CAD::SheetConfiguration':
      return <svg {...iconProps}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>;
    case 'CAD::Detail':
      return <svg {...iconProps}><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>;
    case 'CAD::Project':
      return <svg {...iconProps}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>;
    case 'CAD::TitleBlock':
      return <svg {...iconProps}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>;
    case 'CAD::Construct':
      return <svg {...iconProps}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
    default:
      return <svg {...iconProps}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>;
  }
}

export function WorkspaceSidebar(props: {
  files: Record<string, any>;
  activeFileId: string;
  onSelect: (id: string) => void;
  onAdd: (name: string, type: string) => void;
  onDelete: (name: string) => void;
}) {
  const [sortMode, setSortMode] = createSignal<'alpha' | 'type' | 'newest' | 'oldest'>('type');
  const [showAddMenu, setShowAddMenu] = createSignal(false);
  const [showSortMenu, setShowSortMenu] = createSignal(false);
  let menuRef: HTMLDivElement | undefined;
  let sortRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (showAddMenu()) {
      const handleClick = (e: MouseEvent) => {
        if (menuRef && !menuRef.contains(e.target as Node)) setShowAddMenu(false);
      };
      setTimeout(() => document.addEventListener('click', handleClick), 0);
      onCleanup(() => document.removeEventListener('click', handleClick));
    }
  });

  createEffect(() => {
    if (showSortMenu()) {
      const handleClick = (e: MouseEvent) => {
        if (sortRef && !sortRef.contains(e.target as Node)) setShowSortMenu(false);
      };
      setTimeout(() => document.addEventListener('click', handleClick), 0);
      onCleanup(() => document.removeEventListener('click', handleClick));
    }
  });

  const handleAdd = (type: string) => {
    const name = prompt('File name (e.g. new-file.json):');
    if (name) {
      props.onAdd(name.endsWith('.json') ? name : `${name}.json`, type);
    }
    setShowAddMenu(false);
  };

  const listItems = createMemo(() => {
    const keys = Object.keys(props.files);
    if (sortMode() === 'alpha') {
      keys.sort((a, b) => a.localeCompare(b));
      return keys.map(k => ({ isHeader: false, file: k, label: '' }));
    } else if (sortMode() === 'newest') {
      keys.sort((a, b) => (props.files[b]?._createdAt || 0) - (props.files[a]?._createdAt || 0));
      return keys.map(k => ({ isHeader: false, file: k, label: '' }));
    } else if (sortMode() === 'oldest') {
      keys.sort((a, b) => (props.files[a]?._createdAt || 0) - (props.files[b]?._createdAt || 0));
      return keys.map(k => ({ isHeader: false, file: k, label: '' }));
    } else {
      // By type
      keys.sort((a, b) => {
        const typeA = props.files[a]?.type || 'Unknown';
        const typeB = props.files[b]?.type || 'Unknown';
        if (typeA !== typeB) return typeA.localeCompare(typeB);
        return a.localeCompare(b);
      });

      const items: { isHeader: boolean, file: string, label: string }[] = [];
      let currentType = '';
      keys.forEach(k => {
        const type = props.files[k]?.type || 'Unknown';
        let displayType = type.replace('CAD::', '');
        if (displayType === 'SheetConfiguration') displayType = 'Sheets';
        else if (displayType === 'Detail') displayType = 'Details';
        else if (displayType === 'Project') displayType = 'Projects';
        else if (displayType === 'TitleBlock') displayType = 'Title Blocks';
        else if (displayType === 'Construct') displayType = 'Constructs';
        
        if (type !== currentType) {
          items.push({ isHeader: true, file: '', label: displayType });
          currentType = type;
        }
        items.push({ isHeader: false, file: k, label: '' });
      });
      return items;
    }
  });

  return (
    <div style={{ "pointer-events": 'auto', width: '250px', "background-color": 'var(--app-bg-sidebar)', "backdrop-filter": 'var(--app-backdrop)', color: 'var(--app-text)', border: '1px solid var(--app-border)', display: 'flex', "flex-direction": 'column', margin: '72px 8px 16px 16px', "border-radius": '12px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ padding: '16px', "border-bottom": '1px solid var(--app-border)', display: 'flex', 'justify-content': 'space-between', 'align-items': 'center' }}>
        <span style={{ "font-weight": 'bold' }}>Files</span>
        <div style={{ display: 'flex', gap: '8px', "align-items": 'center' }}>
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button 
              onClick={() => { setShowAddMenu(!showAddMenu()); setShowSortMenu(false); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--app-text)', cursor: 'pointer', "font-size": '20px', "line-height": '1', padding: '0 4px', "font-weight": '300' }}
              title="New File"
            >
              +
            </button>
            {showAddMenu() && (
              <div style={{ position: 'absolute', top: '100%', right: 0, "background-color": 'var(--app-bg-main)', border: '1px solid var(--app-border)', "border-radius": '4px', "box-shadow": '0 4px 12px rgba(0,0,0,0.1)', "z-index": 100, width: '150px', "margin-top": '4px', "font-size": '13px' }}>
                <div onClick={() => handleAdd('CAD::SheetConfiguration')} style={{ padding: '8px 12px', cursor: 'pointer', "border-bottom": '1px solid var(--app-border)' }}>Sheet</div>
                <div onClick={() => handleAdd('CAD::Detail')} style={{ padding: '8px 12px', cursor: 'pointer', "border-bottom": '1px solid var(--app-border)' }}>Detail</div>
                <div onClick={() => handleAdd('CAD::Project')} style={{ padding: '8px 12px', cursor: 'pointer', "border-bottom": '1px solid var(--app-border)' }}>Project</div>
                <div onClick={() => handleAdd('CAD::TitleBlock')} style={{ padding: '8px 12px', cursor: 'pointer' }}>TitleBlock</div>
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }} ref={sortRef}>
            <button 
              onClick={() => { setShowSortMenu(!showSortMenu()); setShowAddMenu(false); }}
              title="Sort Options"
              style={{ background: 'transparent', border: 'none', color: 'var(--app-text-muted)', cursor: 'pointer', padding: '4px', display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5h10"></path><path d="M11 9h10"></path><path d="M11 13h10"></path><path d="M11 17h10"></path><path d="M3 17l4 4 4-4"></path><path d="M7 21V3"></path></svg>
            </button>
            {showSortMenu() && (
              <div style={{ position: 'absolute', top: '100%', right: 0, "background-color": 'var(--app-bg-main)', border: '1px solid var(--app-border)', "border-radius": '4px', "box-shadow": '0 4px 12px rgba(0,0,0,0.1)', "z-index": 100, width: '150px', "margin-top": '4px', "font-size": '13px' }}>
                <div onClick={() => { setSortMode('alpha'); setShowSortMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', "border-bottom": '1px solid var(--app-border)', "background-color": sortMode() === 'alpha' ? 'var(--app-accent)' : 'transparent', color: sortMode() === 'alpha' ? '#ffffff' : 'inherit' }}>A-Z</div>
                <div onClick={() => { setSortMode('type'); setShowSortMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', "border-bottom": '1px solid var(--app-border)', "background-color": sortMode() === 'type' ? 'var(--app-accent)' : 'transparent', color: sortMode() === 'type' ? '#ffffff' : 'inherit' }}>By Type</div>
                <div onClick={() => { setSortMode('newest'); setShowSortMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', "border-bottom": '1px solid var(--app-border)', "background-color": sortMode() === 'newest' ? 'var(--app-accent)' : 'transparent', color: sortMode() === 'newest' ? '#ffffff' : 'inherit' }}>Newest to Oldest</div>
                <div onClick={() => { setSortMode('oldest'); setShowSortMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', "background-color": sortMode() === 'oldest' ? 'var(--app-accent)' : 'transparent', color: sortMode() === 'oldest' ? '#ffffff' : 'inherit' }}>Oldest to Newest</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding: '8px', flex: 1, "overflow-y": 'auto' }}>
        <For each={listItems()}>
          {(item) => {
            if (item.isHeader) {
              return <div style={{ padding: '12px 8px 4px 8px', "font-size": '11px', "font-weight": 'bold', color: 'var(--app-text-muted)', "text-transform": 'uppercase', "letter-spacing": '0.5px' }}>{item.label}</div>;
            }
            const file = item.file;
            const fileType = props.files[file]?.type || '';
            const isActive = file === props.activeFileId;
            const color = isActive ? '#ffffff' : 'inherit';
            return (
              <div 
                style={{
                  padding: '6px 8px',
                  cursor: 'pointer',
                  "background-color": isActive ? 'var(--app-accent)' : 'transparent',
                  "color": color,
                  "border-radius": '4px',
                  display: 'flex',
                  "align-items": 'center',
                  "justify-content": 'space-between',
                  "margin-bottom": '2px',
                  "font-weight": isActive ? '500' : 'normal',
                  "font-size": '13px'
                }}
              >
                <div onClick={() => props.onSelect(file)} style={{ display: 'flex', "align-items": 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                  <FileIcon type={fileType} color={isActive ? '#ffffff' : 'var(--app-text-muted)'} />
                  <span style={{ "white-space": 'nowrap', "overflow": 'hidden', "text-overflow": 'ellipsis' }}>{file}</span>
                </div>
                <button 
                  onClick={() => props.onDelete(file)}
                  style={{ background: 'transparent', border: 'none', color: isActive ? '#ffcdd2' : '#ef4444', cursor: 'pointer', "font-size": '14px', padding: '0 4px', opacity: isActive ? 1 : 0.5 }}
                >×</button>
              </div>
            );
          }}
        </For>
      </div>
      <div style={{ padding: '12px', "border-top": '1px solid var(--app-border)', display: 'flex', 'justify-content': 'center' }}>
        <a 
          href="https://github.com/aeckit/dac" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ display: 'flex', 'align-items': 'center', gap: '6px', color: 'var(--app-text-muted)', "text-decoration": 'none', "font-size": '13px', padding: '6px 12px', 'border-radius': '4px', border: '1px solid var(--app-border)', background: 'var(--app-bg-main)', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--app-text)'; e.currentTarget.style.borderColor = 'var(--app-text-muted)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--app-text-muted)'; e.currentTarget.style.borderColor = 'var(--app-border)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Star on GitHub
        </a>
      </div>
    </div>
  );
}
