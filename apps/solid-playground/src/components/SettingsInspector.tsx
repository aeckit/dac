import { useSettings } from '../hooks/useSettings';
import { BlueprintTheme, PaperTheme } from '@aeckit/dac-renderer-svg';

const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

export function SettingsInspector() {
  const { settings, setSettings } = useSettings();

  const handleAppThemeChange = (e: any) => {
    setSettings(s => ({ ...s, appTheme: e.target.value }));
  };

  const handleCanvasThemeChange = (e: any) => {
    const newTheme = e.target.value;
    setSettings(s => {
      const next = { ...s, canvasTheme: newTheme };
      if (newTheme === 'blueprint') next.customTheme = { ...BlueprintTheme };
      if (newTheme === 'paper') next.customTheme = { ...PaperTheme };
      return next;
    });
  };

  const handleColorChange = (key: keyof typeof BlueprintTheme, value: string) => {
    setSettings(s => ({
      ...s,
      canvasTheme: 'custom',
      customTheme: { ...s.customTheme, [key]: value }
    }));
  };

  return (
    <div style={{ padding: '16px', color: 'var(--app-text)', "background-color": 'var(--app-bg-panel)', "font-family": MONO_FONT, "font-size": '12px' }}>
      <p style={{ margin: '0 0 12px 0', "font-family": MONO_FONT, "font-size": '11px', "font-weight": '600', "text-transform": 'uppercase', "letter-spacing": '0.05em', color: 'var(--app-text-muted)' }}>
        App Settings
      </p>
      
      <div style={{ "margin-bottom": '16px' }}>
        <label style={{ display: 'block', "margin-bottom": '4px', "font-family": MONO_FONT, "font-size": '11px', color: 'var(--app-text-muted)' }}>UI Theme</label>
        <select 
          value={settings().appTheme} 
          onChange={handleAppThemeChange}
          style={{ width: '100%', padding: '6px 8px', "font-family": MONO_FONT, "font-size": '12px', background: 'var(--app-bg-main)', color: 'var(--app-text)', border: '1px solid var(--app-border)', "border-radius": '6px' }}
        >
          <option value="dark">Dark Mode</option>
          <option value="light">Light Mode</option>
        </select>
      </div>

      <div style={{ "margin-bottom": '16px' }}>
        <label style={{ display: 'block', "margin-bottom": '4px', "font-family": MONO_FONT, "font-size": '11px', color: 'var(--app-text-muted)' }}>Canvas Theme</label>
        <select 
          value={settings().canvasTheme} 
          onChange={handleCanvasThemeChange}
          style={{ width: '100%', padding: '6px 8px', "font-family": MONO_FONT, "font-size": '12px', background: 'var(--app-bg-main)', color: 'var(--app-text)', border: '1px solid var(--app-border)', "border-radius": '6px' }}
        >
          <option value="blueprint">Blueprint (Dark)</option>
          <option value="paper">Paper (Light)</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div style={{ "border-top": '1px solid var(--app-border)', "padding-top": '16px' }}>
        <p style={{ margin: '0 0 12px 0', "font-family": MONO_FONT, "font-size": '11px', "font-weight": '600', "text-transform": 'uppercase', "letter-spacing": '0.05em', color: 'var(--app-text-muted)' }}>
          Canvas Colors
        </p>
        {Object.entries(settings().customTheme).map(([key, value]) => (
          <div style={{ display: 'flex', "justify-content": 'space-between', "align-items": 'center', "margin-bottom": '8px' }}>
            <span style={{ "font-size": '11px', color: 'var(--app-text-muted)' }}>{key}</span>
            <input 
              type="color" 
              value={value} 
              onInput={(e) => handleColorChange(key as any, e.currentTarget.value)}
              style={{ padding: '0', margin: '0', border: 'none', background: 'transparent', width: '28px', height: '28px', cursor: 'pointer' }}
            />
          </div>
        ))}
      </div>

      <div style={{ "border-top": '1px solid var(--app-border)', "padding-top": '16px', "margin-top": '16px' }}>
        <p style={{ margin: '0 0 8px 0', "font-family": MONO_FONT, "font-size": '11px', "font-weight": '600', "text-transform": 'uppercase', "letter-spacing": '0.05em', color: '#ef4444' }}>
          Danger Zone
        </p>
        <button 
          onClick={() => {
            if (window.confirm('Are you sure? This will delete all your local changes and restore the default demo files.')) {
              localStorage.removeItem('dac_workspace');
              window.location.reload();
            }
          }}
          style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', "border-radius": '6px', cursor: 'pointer', "font-family": MONO_FONT, "font-size": '11px', "font-weight": '600' }}
        >
          Reload Demo
        </button>
        <p style={{ "font-size": '11px', color: 'var(--app-text-muted)', "margin-top": '8px' }}>
          This will delete all your local files and restore the default demo files from the repository.
        </p>
      </div>
    </div>
  );
}
