import { createSignal, Show, onCleanup, onMount } from 'solid-js';
import { Portal } from 'solid-js/web';
import { SettingsInspector } from './SettingsInspector';
import { SettingsJsonEditor } from './SettingsJsonEditor';
import { useSettings } from '../hooks/useSettings';

export function SettingsModal(props: { isOpen: boolean; onClose: () => void }) {
  const [viewMode, setViewMode] = createSignal<'rendered' | 'json'>('rendered');
  const { cssVariables } = useSettings();

  // Close on Escape
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && props.isOpen) props.onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
  });

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div style={{ ...cssVariables(), position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', "z-index": 100, display: 'flex', "justify-content": 'center', "align-items": 'center' }} onClick={props.onClose}>
          <div style={{ width: '800px', height: '600px', background: 'var(--app-bg-main)', color: 'var(--app-text)', "border-radius": '8px', display: 'flex', "flex-direction": 'column', "box-shadow": '0 4px 20px rgba(0,0,0,0.3)', overflow: 'hidden', border: '1px solid var(--app-border)' }} onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div style={{ padding: '16px', "border-bottom": '1px solid var(--app-border)', display: 'flex', "justify-content": 'space-between', "align-items": 'center', background: 'var(--app-bg-panel)' }}>
              <h2 style={{ margin: 0, "font-size": '18px' }}>App Settings</h2>
              
              {/* Settings Form vs JSON Toggle */}
              <div style={{ display: 'flex', background: 'var(--app-bg-sidebar)', "border-radius": '6px', overflow: 'hidden', border: '1px solid var(--app-border)' }}>
                 <button 
                  onClick={() => setViewMode('rendered')}
                  style={{ padding: '6px 16px', background: viewMode() === 'rendered' ? 'var(--app-btn-bg)' : 'transparent', color: viewMode() === 'rendered' ? 'var(--app-btn-text)' : 'var(--app-text-muted)', border: 'none', "font-size": '12px', cursor: 'pointer', "font-weight": viewMode() === 'rendered' ? 'bold' : 'normal' }}
                >
                  Form
                </button>
                <button 
                  onClick={() => setViewMode('json')}
                  style={{ padding: '6px 16px', background: viewMode() === 'json' ? 'var(--app-btn-bg)' : 'transparent', color: viewMode() === 'json' ? 'var(--app-btn-text)' : 'var(--app-text-muted)', border: 'none', "font-size": '12px', cursor: 'pointer', "font-weight": viewMode() === 'json' ? 'bold' : 'normal' }}
                >
                  JSON
                </button>
              </div>

              <button onClick={props.onClose} style={{ background: 'transparent', border: 'none', color: 'var(--app-text-muted)', cursor: 'pointer', "font-size": '20px' }}>×</button>
            </div>
            
            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
              <Show when={viewMode() === 'rendered'}>
                <SettingsInspector />
              </Show>
              <Show when={viewMode() === 'json'}>
                <SettingsJsonEditor />
              </Show>
            </div>

          </div>
        </div>
      </Portal>
    </Show>
  );
}
