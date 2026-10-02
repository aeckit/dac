import { Show, For } from 'solid-js';
import { useDac } from '../hooks/useDac';
import { GeometryPrimitiveSchema } from '@aeckit/dac-schema';

export function DacInspector() {
  const { selectedShape, updateShape, activeSheetId, doc, selectShape, builder, solverWarnings, selectionIds } = useDac();

  return (
    <div style={{ width: '100%', height: '100%', "background-color": 'var(--app-bg-panel, #1e293b)', color: 'var(--app-text, #f8fafc)', padding: '16px', "box-sizing": 'border-box', "overflow-y": 'auto' }}>
      <Show
        when={selectedShape()}
        fallback={
          <Show when={activeSheetId()} fallback={
            <div>
              <p><strong>View Type:</strong> {doc()?.type}</p>
              
              <div style={{ "margin-top": '16px', "margin-bottom": '16px' }}>
                <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: 'var(--app-text-muted, #94a3b8)' }}>Annotative Scale</label>
                <input 
                  type="text"
                  value={doc()?.scale ?? '1:1'}
                  onChange={(e) => {
                    builder().mutateDocument((d: any) => { 
                      d.scale = e.currentTarget.value; 
                    });
                  }}
                  style={{ width: '100%', padding: '6px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', color: 'var(--app-text, white)', "border-radius": '4px', "box-sizing": 'border-box' }}
                />
              </div>

              <div style={{ "margin-top": '16px' }}>
                <p><strong>Geometries:</strong></p>
                <div style={{ display: 'flex', "flex-direction": 'column', gap: '8px' }}>
                  <For each={doc()?.geometry || []}>
                    {(geom: any, index) => {
                      const id = geom.componentId || `shape_${index()}`;
                      return (
                      <div 
                        onClick={() => selectShape(id)}
                        style={{ padding: '8px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', "border-radius": '4px', cursor: 'pointer' }}
                      >
                        <div style={{ "font-size": '12px', "font-weight": 'bold' }}>{geom.type}</div>
                        <div style={{ "font-size": '10px', color: 'var(--app-text-muted, #94a3b8)' }}>{id}</div>
                      </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </div>
          }>
            <div>
              <p><strong>Sheet Inspector</strong></p>
              <p>Sheet ID: {activeSheetId()}</p>
            </div>
          </Show>
        }
      >
        {(shape) => {
          const currentId = selectionIds()[0];

          const warningsForShape = solverWarnings ? solverWarnings().filter(w => w.componentId === currentId) : [];
          
          return (
          <div>
            <Show when={warningsForShape.length > 0}>
              <div style={{ "background-color": 'rgba(234, 88, 12, 0.1)', border: '1px solid #ea580c', color: '#fed7aa', padding: '12px', "border-radius": '4px', "margin-bottom": '16px', "font-size": '12px' }}>
                <strong style={{ display: 'block', "margin-bottom": '4px', color: '#fdba74' }}>⚠️ Schema Warnings</strong>
                <ul style={{ margin: 0, "padding-left": '20px' }}>
                  <For each={warningsForShape}>
                    {(err) => <li style={{ "margin-bottom": '4px' }}>{err.message}</li>}
                  </For>
                </ul>
              </div>
            </Show>
            <p><strong>Type:</strong> {shape().type}</p>
            <p><strong>ID:</strong> {shape().componentId}</p>
            <div style={{ "margin-top": '16px' }}>
              <For each={Object.keys(shape()).filter(k => k !== 'type' && k !== 'componentId' && k !== 'id' && k !== 'componentType' && typeof shape()[k] !== 'object')}>
                {(key) => {
                  const val = shape()[key];
                  const isNum = typeof val === 'number';
                  const isBool = typeof val === 'boolean';
                  const isColorKey = key === 'color' || key === 'fill';
                  const isHatchKey = key === 'hatch';
                  
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
                      ) : isHatchKey ? (
                        <select
                          value={val ?? ''}
                          onChange={(e) => updateShape(shape().componentId, { [key]: e.currentTarget.value })}
                          style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', color: 'var(--app-text, white)', "border-radius": '4px' }}
                        >
                          <option value="">None</option>
                          <option value="Concrete">Concrete</option>
                          <option value="TimberCross">TimberCross</option>
                        </select>
                      ) : isColorKey ? (
                        <div style={{ display: 'flex', gap: '8px', "margin-bottom": '12px' }}>
                          <input 
                            type="color"
                            value={typeof val === 'string' && val.startsWith('#') ? val.slice(0, 7) : '#000000'}
                            onInput={(e) => updateShape(shape().componentId, { [key]: e.currentTarget.value })}
                            style={{ width: '32px', height: '32px', padding: '0', border: '1px solid var(--app-border, #475569)', background: 'var(--app-bg-main, #0f172a)', cursor: 'pointer', "border-radius": '4px' }}
                          />
                          <input 
                            type="text"
                            value={val ?? ''} 
                            onInput={(e) => updateShape(shape().componentId, { [key]: e.currentTarget.value })}
                            placeholder={key === 'color' ? 'auto' : 'transparent'}
                            style={{ flex: 1, padding: '6px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', color: 'var(--app-text, white)', "border-radius": '4px', "min-width": 0 }}
                          />
                        </div>
                      ) : (
                        <input 
                          type={isNum ? 'number' : 'text'}
                          value={val ?? ''} 
                          onInput={(e) => {
                            let newVal: any = e.currentTarget.value;
                            if (isNum) newVal = parseFloat(newVal) || 0;
                            updateShape(shape().componentId, { [key]: newVal });
                          }}
                          style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', color: 'var(--app-text, white)', "border-radius": '4px', "box-sizing": 'border-box' }}
                        />
                      )}
                    </>
                  );
                }}
              </For>
            </div>
          </div>
        )}}
      </Show>
    </div>
  );
}
