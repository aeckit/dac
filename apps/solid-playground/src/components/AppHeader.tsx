export function AppHeader(props: { activeFileId: string, shareUrl: () => string, onOpenSettings: () => void }) {
  const handleShare = () => {
    navigator.clipboard.writeText(props.shareUrl());
    alert('Share URL copied to clipboard!');
  };

  return (
    <div style={{ display: 'flex', "justify-content": 'space-between', "align-items": 'center', padding: '12px 24px', background: 'var(--app-bg-panel)', color: 'var(--app-text)', margin: '16px 16px 8px 16px', "border-radius": '12px', border: '1px solid var(--app-border)', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ "font-weight": 'bold' }}>Solid Playground - {props.activeFileId}</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={props.onOpenSettings}
          style={{ background: 'var(--app-btn-bg)', color: 'var(--app-btn-text)', border: 'none', padding: '8px 16px', "border-radius": '4px', cursor: 'pointer' }}
        >
          ⚙️ Settings
        </button>
        <button 
          onClick={handleShare}
          style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', "border-radius": '4px', cursor: 'pointer' }}
        >
          Share
        </button>
      </div>
    </div>
  );
}
