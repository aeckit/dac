import { useDac } from '@aeckit/dac-solid';
import { MonacoJsonEditor } from './MonacoJsonEditor';

export function DocJsonEditor() {
  const { doc, builder } = useDac();

  const handleJsonChange = (val: string) => {
    try {
      const parsed = JSON.parse(val);
      builder().setDocument(parsed);
    } catch (e) {
      // invalid json, ignore until fixed
    }
  };

  return <MonacoJsonEditor value={JSON.stringify(doc() || {}, null, 2)} onChange={handleJsonChange} />;
}
