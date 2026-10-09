import { createSignal, For, Show } from 'solid-js';

export function AppHeader(props: { activeFileId: string, filesList: string[], shareUrl: (ids: string[]) => string, rightPaneMode: 'properties' | 'settings' | 'closed', isSidebarOpen: boolean, onOpenProperties: () => void, onOpenSettings: () => void, toggleSidebar: () => void }) {
  const [showShareModal, setShowShareModal] = createSignal(false);
  const [selectedFiles, setSelectedFiles] = createSignal<string[]>([]);
  const [copySuccess, setCopySuccess] = createSignal(false);

  const openShareModal = () => {
    setSelectedFiles([props.activeFileId]);
    setShowShareModal(true);
  };

  const executeShare = () => {
    if (selectedFiles().length === 0) return;
    const url = props.shareUrl(selectedFiles());
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => {
      setCopySuccess(false);
      setShowShareModal(false);
    }, 1500);
  };

  const toggleFile = (id: string) => {
    if (selectedFiles().includes(id)) {
      setSelectedFiles(selectedFiles().filter(f => f !== id));
    } else {
      setSelectedFiles([...selectedFiles(), id]);
    }
  };

  const getBtnStyle = (isActive: boolean) => ({
    display: 'flex', 
    'align-items': 'center', 
    'justify-content': 'center', 
    width: '32px', 
    height: '32px', 
    background: isActive ? 'var(--app-btn-bg)' : 'transparent', 
    color: isActive ? 'var(--app-btn-text)' : 'var(--app-text)', 
    border: 'none', 
    "border-radius": '8px', 
    cursor: 'pointer'
  });

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px', "pointer-events": 'none', display: 'flex', "justify-content": 'space-between', "align-items": 'flex-start', "z-index": 50 }}>
      
      {/* Top Left Pill */}
      <div style={{ "pointer-events": 'auto', display: 'flex', "align-items": 'center', gap: '8px', background: 'var(--app-bg-panel)', "backdrop-filter": 'var(--app-backdrop)', padding: '6px 16px 6px 6px', "border-radius": '9999px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--app-border)' }}>
        <button onClick={props.toggleSidebar} style={getBtnStyle(props.isSidebarOpen)} title="Toggle Sidebar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <span style={{ "font-weight": 'bold', "font-size": '14px', color: 'var(--app-text)' }}>{props.activeFileId}</span>
      </div>

      {/* Top Right Section */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {/* Share Button Pill */}
        <div style={{ "pointer-events": 'auto', display: 'flex', background: 'var(--app-bg-panel)', "backdrop-filter": 'var(--app-backdrop)', padding: '6px', "border-radius": '9999px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--app-border)' }}>
          <button 
            onClick={openShareModal}
            style={{ ...getBtnStyle(false), background: '#10b981', color: 'white' }}
            title="Share"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
          </button>
        </div>

        {/* Properties and Settings Pill */}
        <div style={{ "pointer-events": 'auto', display: 'flex', gap: '4px', background: 'var(--app-bg-panel)', "backdrop-filter": 'var(--app-backdrop)', padding: '6px', "border-radius": '9999px', "box-shadow": '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--app-border)' }}>
          <button 
            onClick={props.onOpenProperties}
            style={getBtnStyle(props.rightPaneMode === 'properties')}
            title="Properties"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="15" y1="3" x2="15" y2="21"></line></svg>
          </button>
          <button 
            onClick={props.onOpenSettings}
            style={getBtnStyle(props.rightPaneMode === 'settings')}
            title="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>
      </div>

      <Show when={showShareModal()}>
        <div style={{ position: 'fixed', inset: 0, "background-color": 'rgba(0,0,0,0.5)', display: 'flex', "align-items": 'center', "justify-content": 'center', "z-index": 100, "pointer-events": 'auto' }}>
          <div style={{ background: 'var(--app-bg-main)', color: 'var(--app-text)', padding: '24px', "border-radius": '12px', "box-shadow": '0 10px 25px rgba(0,0,0,0.2)', width: '400px', "max-width": '90vw' }}>
            <h2 style={{ "margin-top": 0, "margin-bottom": '16px', "font-size": '18px' }}>Share Workspace</h2>
            <p style={{ "font-size": '14px', color: 'var(--app-text-muted)', "margin-bottom": '16px' }}>Select the files you want to include in the share link:</p>
            
            <div style={{ "max-height": '300px', "overflow-y": 'auto', border: '1px solid var(--app-border)', "border-radius": '6px', "margin-bottom": '24px' }}>
              <For each={props.filesList}>
                {(file) => (
                  <label style={{ display: 'flex', "align-items": 'center', gap: '8px', padding: '12px', "border-bottom": '1px solid var(--app-border)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedFiles().includes(file)} 
                      onChange={() => toggleFile(file)}
                    />
                    <span style={{ "font-size": '14px' }}>{file}</span>
                  </label>
                )}
              </For>
            </div>

            <div style={{ display: 'flex', "justify-content": 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setShowShareModal(false)}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--app-border)', color: 'var(--app-text)', "border-radius": '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeShare}
                disabled={selectedFiles().length === 0 || copySuccess()}
                style={{ padding: '8px 16px', background: copySuccess() ? '#10b981' : 'var(--app-accent)', border: 'none', color: 'white', "border-radius": '6px', cursor: (selectedFiles().length > 0 && !copySuccess()) ? 'pointer' : 'default', opacity: selectedFiles().length > 0 ? 1 : 0.5, transition: 'background 0.2s' }}
              >
                {copySuccess() ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </Show>

    </div>
  );
}
