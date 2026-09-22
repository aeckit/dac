export function AppHeader(props: { activeFileId: string, shareUrl: () => string, onOpenSettings: () => void, toggleSidebar: () => void }) {
  const handleShare = () => {
    navigator.clipboard.writeText(props.shareUrl());
    alert('Share URL copied to clipboard!');
  };

  const iconBtnStyle = {
    display: 'flex', 
    'align-items': 'center', 
    'justify-content': 'center', 
    width: '32px', 
    height: '32px', 
    background: 'transparent', 
    color: 'var(--app-text)', 
    border: 'none', 
    "border-radius": '8px', 
    cursor: 'pointer'
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px', "pointer-events": 'none', display: 'flex', "justify-content": 'space-between', "align-items": 'flex-start', "z-index": 50 }}>
      
      {/* Top Left Pill */}
      <div style={{ "pointer-events": 'auto', display: 'flex', "align-items": 'center', gap: '8px', background: 'var(--app-bg-panel)', padding: '6px 16px 6px 6px', "border-radius": '9999px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--app-border)' }}>
        <button onClick={props.toggleSidebar} style={iconBtnStyle} title="Toggle Sidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <span style={{ "font-weight": 'bold', "font-size": '14px', color: 'var(--app-text)' }}>{props.activeFileId}</span>
      </div>

      {/* Top Right Pill */}
      <div style={{ "pointer-events": 'auto', display: 'flex', gap: '4px', background: 'var(--app-bg-panel)', padding: '6px', "border-radius": '9999px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--app-border)' }}>
        <button 
          onClick={props.onOpenSettings}
          style={iconBtnStyle}
          title="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
        <button 
          onClick={handleShare}
          style={{ ...iconBtnStyle, background: '#10b981', color: 'white' }}
          title="Share"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
        </button>
      </div>
    </div>
  );
}
