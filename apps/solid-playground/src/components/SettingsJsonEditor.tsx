import { useSettings } from '../hooks/useSettings';
import { MonacoJsonEditor } from './MonacoJsonEditor';

export function SettingsJsonEditor() {
  const { settings, setSettings } = useSettings();

  const handleJsonChange = (val: string) => {
    try {
      const parsed = JSON.parse(val);
      setSettings(parsed);
    } catch (e) {
      // invalid json, ignore until fixed
    }
  };

  return <MonacoJsonEditor value={JSON.stringify(settings() || {}, null, 2)} onChange={handleJsonChange} />;
}
