export function AppHeader(props: { activeFileId: string, shareUrl: () => string }) {
  const handleShare = () => {
    navigator.clipboard.writeText(props.shareUrl());
    alert('Share URL copied to clipboard!');
  };

  return (
    <div style={{ display: 'flex', "justify-content": 'space-between', "align-items": 'center', padding: '12px 24px', background: '#1e293b', color: 'white', "border-bottom": '1px solid #334155' }}>
      <div style={{ "font-weight": 'bold' }}>Solid Playground - {props.activeFileId}</div>
      <button 
        onClick={handleShare}
        style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', "border-radius": '4px', cursor: 'pointer' }}
      >
        Share
      </button>
    </div>
  );
}
