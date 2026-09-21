import { useDac } from '../hooks/useDac';

export function DacToolbar() {
  const { addShape, setZoom, zoom, fitView } = useDac();

  const buttonStyle = {
    background: 'var(--app-btn-bg, #334155)',
    border: 'none',
    color: 'var(--app-btn-text, white)',
    padding: '8px 12px',
    cursor: 'pointer',
    "border-radius": '4px',
    "margin-right": '8px',
    "font-size": '14px',
    display: 'flex',
    "align-items": 'center',
    gap: '6px'
  };

  return (
    <div style={{ display: 'flex', padding: '12px', "background-color": 'var(--app-bg-panel, #1e293b)', "border-bottom": '1px solid var(--app-border, #334155)', "align-items": 'center' }}>
      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
        <button style={buttonStyle} onClick={() => addShape('Rectangle', { width: 4, height: 2 })}>Rectangle</button>
        <button style={buttonStyle} onClick={() => addShape('Line', { x2: 4, y2: 2 })}>Line</button>
        <button style={buttonStyle} onClick={() => addShape('Circle', { radius: 2 })}>Circle</button>
        <button style={buttonStyle} onClick={() => addShape('Text', { text: 'New Text' })}>Text</button>
      </div>
      <div style={{ display: 'flex', gap: '8px', "align-items": 'center' }}>
        <button style={buttonStyle} onClick={() => setZoom(z => z * 0.9)}>-</button>
        <span style={{ color: 'var(--app-text, white)', "font-size": '14px', "min-width": '40px', "text-align": 'center' }}>{Math.round(zoom() * 100)}%</span>
        <button style={buttonStyle} onClick={() => setZoom(z => z * 1.1)}>+</button>
        <button style={buttonStyle} onClick={fitView}>Fit</button>
      </div>
    </div>
  );
}
