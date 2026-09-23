import { Show, For } from 'solid-js';
import { useDac } from '../hooks/useDac';

export function DacInspector() {
  const { selectedShape, updateShape, activeSheetId } = useDac();

  return (
    <div style={{ width: '100%', height: '100%', "background-color": 'var(--app-bg-panel, #1e293b)', color: 'var(--app-text, #f8fafc)', padding: '16px', "box-sizing": 'border-box', "overflow-y": 'auto' }}>
      <h3 style={{ "margin-top": '0' }}>Inspector</h3>
      
      <Show
        when={selectedShape()}
        fallback={
          <Show when={activeSheetId()} fallback={<p style={{ color: 'var(--app-text-muted, #94a3b8)' }}>Select a shape or sheet to inspect properties.</p>}>
            <div>
              <p><strong>Sheet Inspector</strong></p>
              <p>Sheet ID: {activeSheetId()}</p>
            </div>
          </Show>
        }
      >
        {(shape) => (
          <div>
            <p><strong>Type:</strong> {shape().type}</p>
            <p><strong>ID:</strong> {shape().componentId}</p>
            <div style={{ "margin-top": '16px' }}>
              <For each={Object.keys(shape()).filter(k => k !== 'type' && k !== 'componentId' && k !== 'id' && k !== 'componentType' && typeof shape()[k] !== 'object')}>
                {(key) => {
                  const val = shape()[key];
                  const isNum = typeof val === 'number';
                  const isBool = typeof val === 'boolean';
                  
                  return (
                    <>
                      <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: 'var(--app-text-muted, #94a3b8)' }}>{key}</label>
                      {isBool ? (
                        <input 
                          type="checkbox" 
                          checked={val} 
                          onChange={(e) => updateShape(shape().componentId, { [key]: e.currentTarget.checked })}
                          style={{ "margin-bottom": '12px' }}
                        />
                      ) : (
                        <input 
                          type={isNum ? 'number' : 'text'}
                          value={val ?? ''} 
                          onInput={(e) => {
                            let newVal: any = e.currentTarget.value;
                            if (isNum) newVal = parseFloat(newVal) || 0;
                            updateShape(shape().componentId, { [key]: newVal });
                          }}
                          style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', color: 'var(--app-text, white)', "border-radius": '4px' }}
                        />
                      )}
                    </>
                  );
                }}
              </For>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
