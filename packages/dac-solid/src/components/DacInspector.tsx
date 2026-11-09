import { Show, For, createEffect } from 'solid-js';
import { useDac } from '../hooks/useDac';
import { resolveDocumentParameters } from '@aeckit/dac-json-solver';
import { DocumentParametersInspector, ConstructReferenceInspector } from './ParametersInspector';
import { PropertyField } from './PropertyField';
import { inspectorStyles } from './inspectorStyles';

const UI_CONFIG: Record<string, { hiddenFields: string[] }> = {
  'CAD::Detail': { hiddenFields: ['version'] },
  'CAD::TitleBlock': { hiddenFields: ['version', 'parameterDefinitions'] },
  'CAD::Project': { hiddenFields: ['version'] },
  'CAD::SheetConfiguration': { hiddenFields: ['version'] }
};

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
      <label style={inspectorStyles.label}>{props.keyName}</label>
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
          type="text"
          inputmode={isNum() ? 'decimal' : undefined}
          onInput={(e) => {
            const raw = e.currentTarget.value;
            if (isNum()) {
              if (raw === '' || raw === '-' || raw.endsWith('.') || raw === '.') {
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
          onBlur={() => {
            if (inputRef) {
              const v = val();
              inputRef.value = v !== undefined && v !== null ? String(v) : '';
            }
          }}
          style={{ ...inspectorStyles.input, "margin-bottom": '12px' }}
        />
      )}
    </>
  );
}

export function DacInspector() {
  const { selectedShape, updateShape, activeSheetId, doc, selectShape, builder, solverWarnings, selectionIds, nestedDocs } = useDac();

  const selectedId = () => (selectionIds().length === 1 && selectedShape()) ? selectionIds()[0] : null;

  return (
    <div style={inspectorStyles.container}>
      <Show
        when={selectedId()}
        keyed
        fallback={
          <Show when={activeSheetId()} fallback={
            <div>
              <div style={inspectorStyles.metaRow}>
                <span style={inspectorStyles.metaLabel}>View Type</span>
                <span style={inspectorStyles.metaValue}>{doc()?.type}</span>
              </div>
              
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

              <DocumentParametersInspector
                parameters={() => doc()?.parameters}
                builder={builder}
              />

              <div style={{ "margin-top": '16px' }}>
                <Show when={doc()?.geometry && doc().geometry.length > 0}>
                  <p style={inspectorStyles.sectionTitle}>Geometries</p>
                  <div style={{ display: 'flex', "flex-direction": 'column', gap: '8px', "margin-bottom": '16px' }}>
                    <For each={doc()?.geometry || []}>
                      {(geom: any, index) => {
                        const id = geom.componentId || `shape_${index()}`;
                        return (
                          <div 
                            onClick={() => selectShape(id)}
                            style={inspectorStyles.cardItem}
                          >
                            <div style={{ "font-size": '11px', "font-weight": '600', color: 'var(--app-text, inherit)' }}>{geom.type}</div>
                            <div style={{ "font-size": '10px', color: 'var(--app-text-muted, #94a3b8)' }}>{id}</div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>

                <Show when={doc()?.viewports && doc().viewports.length > 0}>
                  <p style={inspectorStyles.sectionTitle}>Viewports</p>
                  <div style={{ display: 'flex', "flex-direction": 'column', gap: '8px', "margin-bottom": '16px' }}>
                    <For each={doc()?.viewports || []}>
                      {(vp: any, index) => {
                        const id = vp.componentId || `vp_${index()}`;
                        return (
                          <div 
                            onClick={() => selectShape(id)}
                            style={inspectorStyles.cardItem}
                          >
                            <div style={{ "font-size": '11px', "font-weight": '600', color: 'var(--app-text, inherit)' }}>{vp.title || 'Viewport'}</div>
                            <div style={{ "font-size": '10px', color: 'var(--app-text-muted, #94a3b8)' }}>{vp.detail}</div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>

                <Show when={doc()?.titleBlockRef}>
                  <p style={inspectorStyles.sectionTitle}>Title Block</p>
                  <div style={{ ...inspectorStyles.cardItem, "margin-bottom": '16px', cursor: 'default' }}>
                    <div style={{ "font-size": '11px', "font-weight": '600', color: 'var(--app-text, inherit)' }}>Reference</div>
                    <div style={{ "font-size": '10px', color: 'var(--app-text-muted, #94a3b8)' }}>{doc()?.titleBlockRef}</div>
                  </div>
                </Show>
              </div>
            </div>
          }>
            <div>
              <p style={inspectorStyles.sectionTitle}>Sheet Inspector</p>
              <div style={inspectorStyles.metaRow}>
                <span style={inspectorStyles.metaLabel}>Sheet ID</span>
                <span style={inspectorStyles.metaValue}>{activeSheetId()}</span>
              </div>
            </div>
          </Show>
        }
      >
        {(currentId) => {
          const shape = () => selectedShape();
          const warningsForShape = () => solverWarnings ? solverWarnings().filter(w => w.componentId === currentId) : [];
          const keys = () => {
            const s = shape();
            if (!s) return [];
            const rawKeys = Object.keys(s);
            const t = s.type ? String(s.type.split('::').pop() || '') : '';
            if (t === 'Dimension') {
              ['x1', 'y1', 'x2', 'y2', 'offset', 'prefix', 'suffix', 'textOverride', 'secondaryText', 'textPosition', 'fontSize', 'color'].forEach(k => {
                if (!rawKeys.includes(k)) rawKeys.push(k);
              });
            } else if (t === 'Leader') {
              ['x', 'y', 'dx', 'dy', 'shoulderLength', 'text', 'fontSize', 'color'].forEach(k => {
                if (!rawKeys.includes(k)) rawKeys.push(k);
              });
            } else if (t === 'Polyline') {
              ['points', 'closed', 'cornerRadius', 'fill', 'color', 'strokeWidth', 'strokeDasharray', 'rotation'].forEach(k => {
                if (!rawKeys.includes(k)) rawKeys.push(k);
              });
            }
            return rawKeys.filter(k => k !== 'type' && k !== 'componentId' && k !== 'id' && k !== 'componentType' && (k === 'points' || typeof (s as any)[k] !== 'object'));
          };

          const resolvedParams = () => resolveDocumentParameters(doc());

          return (
            <div>
              <Show when={warningsForShape().length > 0}>
                <div style={{ "background-color": 'rgba(234, 88, 12, 0.1)', border: '1px solid #ea580c', color: '#fed7aa', padding: '10px 12px', "border-radius": '6px', "margin-bottom": '16px', "font-size": '11px', "font-family": inspectorStyles.sectionTitle["font-family"] }}>
                  <strong style={{ display: 'block', "margin-bottom": '4px', color: '#fdba74' }}>⚠️ Schema Warnings</strong>
                  <ul style={{ margin: 0, "padding-left": '20px' }}>
                    <For each={warningsForShape()}>
                      {(err) => <li style={{ "margin-bottom": '4px' }}>{err.message}</li>}
                    </For>
                  </ul>
                </div>
              </Show>
              <div style={inspectorStyles.metaRow}>
                <span style={inspectorStyles.metaLabel}>Type</span>
                <span style={inspectorStyles.metaValue}>{shape()?.type}</span>
              </div>
              <div style={{ ...inspectorStyles.metaRow, "margin-bottom": '16px' }}>
                <span style={inspectorStyles.metaLabel}>ID</span>
                <span style={inspectorStyles.metaValue}>{currentId}</span>
              </div>
              <div style={{ "margin-top": '16px' }}>
                <For each={keys()}>
                  {(key) => (
                    <PropertyField
                      keyName={key}
                      shape={shape}
                      currentId={currentId}
                      updateShape={updateShape}
                      resolvedParams={resolvedParams}
                    />
                  )}
                </For>
              </div>

              <Show when={shape()?.type === 'ConstructReference'}>
                <ConstructReferenceInspector
                  shape={shape}
                  currentId={currentId}
                  nestedDocs={nestedDocs}
                  updateShape={updateShape}
                />
              </Show>
            </div>
          );
        }}
      </Show>
    </div>
  );
}
