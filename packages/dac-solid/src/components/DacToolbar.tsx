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
        <button style={buttonStyle} onClick={() => addShape('Polyline', { points: [[0, 0], [4, 0], [4, 2], [8, 2]], closed: false })} title="Polyline">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 17 9 7 15 15 21 9"></polyline>
            <circle cx="3" cy="17" r="1.5"></circle>
            <circle cx="9" cy="7" r="1.5"></circle>
            <circle cx="15" cy="15" r="1.5"></circle>
            <circle cx="21" cy="9" r="1.5"></circle>
          </svg>
        </button>
        <button style={buttonStyle} onClick={() => addShape('Circle', { cx: 2, cy: 2, r: 2 })} title="Circle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>
        </button>
        <button style={buttonStyle} onClick={() => addShape('Text', { text: 'New Text' })} title="Text">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
        </button>
        <button style={buttonStyle} onClick={() => addShape('Leader', { x: 2, y: 2, dx: 0.75, dy: 0.5, text: 'Note' })} title="Leader">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19L14 9h7" /><path d="M9 18L4 19L5 14" /></svg>
        </button>
        <button style={buttonStyle} onClick={() => addShape('Dimension', { x1: 2, y1: 2, x2: 6, y2: 2, offset: 20 })} title="Dimension">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="5" x2="3" y2="19" /><line x1="21" y1="5" x2="21" y2="19" /><line x1="3" y1="12" x2="21" y2="12" /><polyline points="7 9 3 12 7 15" /><polyline points="17 9 21 12 17 15" /></svg>
        </button>
      </div>
    </div>
  );
}
