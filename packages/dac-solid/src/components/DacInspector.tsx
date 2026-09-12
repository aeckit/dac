import { Show } from 'solid-js';
import { useDac } from '../hooks/useDac';

export function DacInspector() {
  const { selectedShape, updateShape, activeSheetId } = useDac();

  return (
    <div style={{ width: '300px', "background-color": '#1e293b', color: '#f8fafc', padding: '16px', "box-sizing": 'border-box', "border-left": '1px solid #334155', "overflow-y": 'auto' }}>
      <h3 style={{ "margin-top": '0' }}>Inspector</h3>
      
      <Show
        when={selectedShape()}
        fallback={
          <Show when={activeSheetId()} fallback={<p style={{ color: '#94a3b8' }}>Select a shape or sheet to inspect properties.</p>}>
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
              <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: '#94a3b8' }}>X</label>
              <input 
                type="number" 
                value={shape().x ?? 0} 
                onInput={(e) => updateShape(shape().componentId, { x: parseFloat(e.currentTarget.value) })}
                style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: '#0f172a', border: '1px solid #475569', color: 'white', "border-radius": '4px' }}
              />
              <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: '#94a3b8' }}>Y</label>
              <input 
                type="number" 
                value={shape().y ?? 0} 
                onInput={(e) => updateShape(shape().componentId, { y: parseFloat(e.currentTarget.value) })}
                style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: '#0f172a', border: '1px solid #475569', color: 'white', "border-radius": '4px' }}
              />
              <Show when={shape().width !== undefined}>
                <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: '#94a3b8' }}>Width</label>
                <input 
                  type="number" 
                  value={shape().width} 
                  onInput={(e) => updateShape(shape().componentId, { width: parseFloat(e.currentTarget.value) })}
                  style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: '#0f172a', border: '1px solid #475569', color: 'white', "border-radius": '4px' }}
                />
              </Show>
              <Show when={shape().height !== undefined}>
                <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: '#94a3b8' }}>Height</label>
                <input 
                  type="number" 
                  value={shape().height} 
                  onInput={(e) => updateShape(shape().componentId, { height: parseFloat(e.currentTarget.value) })}
                  style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: '#0f172a', border: '1px solid #475569', color: 'white', "border-radius": '4px' }}
                />
              </Show>
              <Show when={shape().text !== undefined}>
                <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: '#94a3b8' }}>Text</label>
                <input 
                  type="text" 
                  value={shape().text} 
                  onInput={(e) => updateShape(shape().componentId, { text: e.currentTarget.value })}
                  style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: '#0f172a', border: '1px solid #475569', color: 'white', "border-radius": '4px' }}
                />
              </Show>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
