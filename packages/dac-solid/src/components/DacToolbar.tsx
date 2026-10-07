import { useDac } from '../hooks/useDac';

export function DacToolbar() {
  const { addShape } = useDac();

  const buttonStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--app-text, #cbd5e1)',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    "border-radius": '8px',
    display: 'flex',
    "align-items": 'center',
    "justify-content": 'center',
  };

  return (
    <div style={{ "pointer-events": 'auto', display: 'flex', padding: '6px', "background-color": 'var(--app-bg-panel, #1e293b)', "backdrop-filter": 'var(--app-backdrop)', border: '1px solid var(--app-border, #334155)', "align-items": 'center', margin: '16px', "border-radius": '9999px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button style={buttonStyle} onClick={() => addShape('Rectangle', { width: 4, height: 2 })} title="Rectangle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
        </button>
        <button style={buttonStyle} onClick={() => addShape('Line', { x2: 4, y2: 2 })} title="Line">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="19" x2="19" y2="5"></line></svg>
        </button>
        <button style={buttonStyle} onClick={() => addShape('Circle', { cx: 2, cy: 2, r: 2 })} title="Circle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
        </button>
        <button style={buttonStyle} onClick={() => addShape('Text', { text: 'New Text' })} title="Text">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
        </button>
      </div>
    </div>
  );
}
