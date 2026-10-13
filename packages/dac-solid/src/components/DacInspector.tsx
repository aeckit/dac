import { Show, For, createEffect } from 'solid-js';
import { useDac } from '../hooks/useDac';

const UI_CONFIG: Record<string, { hiddenFields: string[] }> = {
  'CAD::Detail': { hiddenFields: ['version'] },
  'CAD::TitleBlock': { hiddenFields: ['version', 'parameterDefinitions'] },
  'CAD::Project': { hiddenFields: ['version'] },
  'CAD::SheetConfiguration': { hiddenFields: ['version'] }
};

function PropertyField(props: {
  keyName: string;
  shape: () => any;
  currentId: string;
  updateShape: (id: string, properties: any) => void;
}) {
  const isColorKey = props.keyName === 'color' || props.keyName === 'fill';
  const isHatchKey = props.keyName === 'hatch';
  const val = () => props.shape()?.[props.keyName];
  const isNum = () => typeof val() === 'number';
  const isBool = () => typeof val() === 'boolean';

  let inputRef!: HTMLInputElement;

  createEffect(() => {
    const v = val();
    if (inputRef && document.activeElement !== inputRef) {
      inputRef.value = v ?? '';
    }
  });

  return (
    <>
      <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: 'var(--app-text-muted, #94a3b8)' }}>{props.keyName}</label>
      {isBool() ? (
        <input 
          type="checkbox" 
          checked={Boolean(val())} 
          onChange={(e) => props.updateShape(props.currentId, { [props.keyName]: e.currentTarget.checked })}
          style={{ "margin-bottom": '12px' }}
        />
      ) : isHatchKey ? (
        <select
          value={val() ?? ''}
          onChange={(e) => props.updateShape(props.currentId, { [props.keyName]: e.currentTarget.value })}
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
            value={typeof val() === 'string' && val().startsWith('#') ? val().slice(0, 7) : '#000000'}
            onInput={(e) => props.updateShape(props.currentId, { [props.keyName]: e.currentTarget.value })}
            style={{ width: '32px', height: '32px', padding: '0', border: '1px solid var(--app-border, #475569)', background: 'var(--app-bg-main, #0f172a)', cursor: 'pointer', "border-radius": '4px' }}
          />
          <input 
            ref={inputRef}
            type="text"
            value={val() ?? ''} 
            onInput={(e) => props.updateShape(props.currentId, { [props.keyName]: e.currentTarget.value })}
            placeholder={props.keyName === 'color' ? 'auto' : 'transparent'}
            style={{ flex: 1, padding: '6px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', color: 'var(--app-text, white)', "border-radius": '4px', "min-width": 0 }}
          />
        </div>
      ) : (
        <input 
          ref={inputRef}
          type={isNum() ? 'number' : 'text'}
          value={val() ?? ''} 
          onInput={(e) => {
            const raw = e.currentTarget.value;
            if (isNum()) {
              if (raw === '' || raw === '-' || raw.endsWith('.')) {
                return;
              }
              const parsed = parseFloat(raw);
              if (!isNaN(parsed)) {
                props.updateShape(props.currentId, { [props.keyName]: parsed });
              }
            } else {
              props.updateShape(props.currentId, { [props.keyName]: raw });
            }
          }}
          onChange={(e) => {
            if (isNum()) {
              const parsed = parseFloat(e.currentTarget.value);
              const finalVal = isNaN(parsed) ? 0 : parsed;
              e.currentTarget.value = String(finalVal);
              props.updateShape(props.currentId, { [props.keyName]: finalVal });
            }
          }}
          style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', color: 'var(--app-text, white)', "border-radius": '4px', "box-sizing": 'border-box' }}
        />
      )}
    </>
  );
}

function DocumentField(props: {
  keyName: string;
  doc: () => any;
  builder: () => any;
}) {
  const val = () => props.doc()?.[props.keyName];
  const isNum = () => typeof val() === 'number';
  const isBool = () => typeof val() === 'boolean';
  let inputRef!: HTMLInputElement;

  createEffect(() => {
    const v = val();
    if (inputRef && document.activeElement !== inputRef) {
      inputRef.value = v ?? '';
    }
  });

  return (
    <>
      <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: 'var(--app-text-muted, #94a3b8)' }}>{props.keyName}</label>
      {isBool() ? (
        <input 
          type="checkbox" 
          checked={Boolean(val())} 
          onChange={(e) => props.builder().mutateDocument((d: any) => { d[props.keyName] = e.currentTarget.checked; })}
          style={{ "margin-bottom": '12px' }}
        />
      ) : (
        <input 
          ref={inputRef}
          type={isNum() ? 'number' : 'text'}
          value={val() ?? ''} 
          onInput={(e) => {
            const raw = e.currentTarget.value;
            if (isNum()) {
              if (raw === '' || raw === '-' || raw.endsWith('.')) {
                return;
              }
              const parsed = parseFloat(raw);
              if (!isNaN(parsed)) {
                props.builder().mutateDocument((d: any) => { d[props.keyName] = parsed; });
              }
            } else {
              props.builder().mutateDocument((d: any) => { d[props.keyName] = raw; });
            }
          }}
          onChange={(e) => {
            if (isNum()) {
              const parsed = parseFloat(e.currentTarget.value);
              const finalVal = isNaN(parsed) ? 0 : parsed;
              e.currentTarget.value = String(finalVal);
              props.builder().mutateDocument((d: any) => { d[props.keyName] = finalVal; });
            }
          }}
          style={{ width: '100%', "margin-bottom": '12px', padding: '6px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', color: 'var(--app-text, white)', "border-radius": '4px', "box-sizing": 'border-box' }}
        />
      )}
    </>
  );
}

export function DacInspector() {
  const { selectedShape, updateShape, activeSheetId, doc, selectShape, builder, solverWarnings, selectionIds } = useDac();

  const selectedId = () => (selectionIds().length === 1 && selectedShape()) ? selectionIds()[0] : null;

  return (
    <div style={{ width: '100%', height: '100%', "background-color": 'var(--app-bg-panel, #1e293b)', color: 'var(--app-text, #f8fafc)', padding: '16px', "box-sizing": 'border-box', "overflow-y": 'auto' }}>
      <Show
        when={selectedId()}
        keyed
        fallback={
          <Show when={activeSheetId()} fallback={
            <div>
              <p><strong>View Type:</strong> {doc()?.type}</p>
              
              <div style={{ "margin-top": '16px', "margin-bottom": '16px' }}>
                <For each={Object.keys(doc() || {}).filter(k => {
                  if (k === 'type' || k === 'geometry' || k === 'viewports' || k === 'titleblocks' || typeof (doc() || {})[k] === 'object') return false;
                  const docType = doc()?.type;
                  if (docType && UI_CONFIG[docType]?.hiddenFields.includes(k)) return false;
                  return true;
                })}>
                  {(key) => (
                    <DocumentField
                      keyName={key}
                      doc={doc}
                      builder={builder}
                    />
                  )}
                </For>
              </div>

              <div style={{ "margin-top": '16px' }}>
                <Show when={doc()?.geometry && doc().geometry.length > 0}>
                  <p><strong>Geometries:</strong></p>
                  <div style={{ display: 'flex', "flex-direction": 'column', gap: '8px', "margin-bottom": '16px' }}>
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
                </Show>

                <Show when={doc()?.viewports && doc().viewports.length > 0}>
                  <p><strong>Viewports:</strong></p>
                  <div style={{ display: 'flex', "flex-direction": 'column', gap: '8px', "margin-bottom": '16px' }}>
                    <For each={doc()?.viewports || []}>
                      {(vp: any, index) => {
                        const id = vp.componentId || `vp_${index()}`;
                        return (
                          <div 
                            onClick={() => selectShape(id)}
                            style={{ padding: '8px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', "border-radius": '4px', cursor: 'pointer' }}
                          >
                            <div style={{ "font-size": '12px', "font-weight": 'bold' }}>{vp.title || 'Viewport'}</div>
                            <div style={{ "font-size": '10px', color: 'var(--app-text-muted, #94a3b8)' }}>{vp.detail}</div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>

                <Show when={doc()?.titleBlockRef}>
                  <p><strong>Title Block:</strong></p>
                  <div style={{ padding: '8px', background: 'var(--app-bg-main, #0f172a)', border: '1px solid var(--app-border, #475569)', "border-radius": '4px', "margin-bottom": '16px' }}>
                    <div style={{ "font-size": '12px', "font-weight": 'bold' }}>Reference</div>
                    <div style={{ "font-size": '10px', color: 'var(--app-text-muted, #94a3b8)' }}>{doc()?.titleBlockRef}</div>
                  </div>
                </Show>
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
        {(currentId) => {
          const shape = () => selectedShape();
          const warningsForShape = () => solverWarnings ? solverWarnings().filter(w => w.componentId === currentId) : [];
          const keys = () => Object.keys(shape() || {}).filter(k => k !== 'type' && k !== 'componentId' && k !== 'id' && k !== 'componentType' && typeof (shape() as any)[k] !== 'object');

          return (
            <div>
              <Show when={warningsForShape().length > 0}>
                <div style={{ "background-color": 'rgba(234, 88, 12, 0.1)', border: '1px solid #ea580c', color: '#fed7aa', padding: '12px', "border-radius": '4px', "margin-bottom": '16px', "font-size": '12px' }}>
                  <strong style={{ display: 'block', "margin-bottom": '4px', color: '#fdba74' }}>⚠️ Schema Warnings</strong>
                  <ul style={{ margin: 0, "padding-left": '20px' }}>
                    <For each={warningsForShape()}>
                      {(err) => <li style={{ "margin-bottom": '4px' }}>{err.message}</li>}
                    </For>
                  </ul>
                </div>
              </Show>
              <p><strong>Type:</strong> {shape()?.type}</p>
              <p><strong>ID:</strong> {currentId}</p>
              <div style={{ "margin-top": '16px' }}>
                <For each={keys()}>
                  {(key) => (
                    <PropertyField
                      keyName={key}
                      shape={shape}
                      currentId={currentId}
                      updateShape={updateShape}
                    />
                  )}
                </For>
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
}
