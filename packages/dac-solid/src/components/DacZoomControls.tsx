import { useDac } from '../hooks/useDac';

export function DacZoomControls() {
  const { setZoom, zoom, fitView } = useDac();

  const buttonStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--app-text, white)',
    padding: '6px',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    "border-radius": '6px',
    display: 'flex',
    "align-items": 'center',
    "justify-content": 'center',
  };

  return (
    <div style={{ "pointer-events": 'auto', display: 'flex', gap: '4px', padding: '6px', "background-color": 'var(--app-bg-panel, #1e293b)', "backdrop-filter": 'var(--app-backdrop)', border: '1px solid var(--app-border, #334155)', "align-items": 'center', margin: '8px 8px 16px 16px', "border-radius": '12px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)' }}>
      <button style={buttonStyle} onClick={() => setZoom(z => z * 0.9)} title="Zoom Out">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
      <span style={{ color: 'var(--app-text, white)', "font-size": '13px', "min-width": '40px', "text-align": 'center', "font-weight": 'bold' }}>{Math.round(zoom() * 100)}%</span>
      <button style={buttonStyle} onClick={() => setZoom(z => z * 1.1)} title="Zoom In">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
      <button style={{ ...buttonStyle, "border-left": '1px solid var(--app-border)', "border-radius": '0 4px 4px 0', "margin-left": '4px', "padding-left": '8px' }} onClick={fitView} title="Fit to View">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3"></path>
          <path d="M21 8V5a2 2 0 0 0-2-2h-3"></path>
          <path d="M3 16v3a2 2 0 0 0 2 2h3"></path>
          <path d="M16 21h3a2 2 0 0 0 2-2v-3"></path>
        </svg>
      </button>
    </div>
  );
}
