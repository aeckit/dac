import { createEffect } from 'solid-js';
import { evaluateExpression } from '@aeckit/dac-json-solver';
import { inspectorStyles } from './inspectorStyles';

export function PropertyField(props: {
  keyName: string;
  shape: () => any;
  currentId: string;
  updateShape: (id: string, properties: any) => void;
  resolvedParams?: () => Record<string, any>;
}) {
  const isColorKey = props.keyName === 'color' || props.keyName === 'fill';
  const isHatchKey = props.keyName === 'hatch';
  const val = () => props.shape()?.[props.keyName];
  const isNum = () => typeof val() === 'number';
  const isBool = () => typeof val() === 'boolean';
  const isExpr = () => typeof val() === 'string' && val().includes('{parameters.');
  const resolvedVal = () => {
    if (!isExpr()) return undefined;
    try {
      return evaluateExpression(val(), props.resolvedParams?.() || {});
    } catch (e) {
      return 'Error';
    }
  };

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
          onChange={(e) => props.updateShape(props.currentId, { [props.keyName]: e.currentTarget.checked })}
          style={{ "margin-bottom": '12px' }}
        />
      ) : props.keyName === 'textPosition' ? (
        <select
          value={val() ?? 'above'}
          onChange={(e) => props.updateShape(props.currentId, { [props.keyName]: e.currentTarget.value })}
          style={{ ...inspectorStyles.input, "margin-bottom": '12px' }}
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
      ) : isHatchKey ? (
        <select
          value={val() ?? ''}
          onChange={(e) => props.updateShape(props.currentId, { [props.keyName]: e.currentTarget.value })}
          style={{ ...inspectorStyles.input, "margin-bottom": '12px' }}
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
            style={{ width: '32px', height: '32px', padding: '0', border: '1px solid var(--app-border, #475569)', background: 'var(--app-bg-main, #0f172a)', cursor: 'pointer', "border-radius": '6px' }}
          />
          <input 
            ref={inputRef}
            type="text"
            onInput={(e) => props.updateShape(props.currentId, { [props.keyName]: e.currentTarget.value })}
            placeholder={props.keyName === 'color' ? 'auto' : 'transparent'}
            style={{ ...inspectorStyles.input, flex: 1, "min-width": 0 }}
          />
        </div>
      ) : (
        <>
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
            onBlur={() => {
              if (inputRef) {
                const v = val();
                inputRef.value = v !== undefined && v !== null ? String(v) : '';
              }
            }}
            style={{ ...inspectorStyles.input, "margin-bottom": isExpr() ? '4px' : '12px' }}
          />
          {isExpr() && (
            <div style={{
              display: 'flex',
              "align-items": 'center',
              gap: '6px',
              "margin-bottom": '12px',
              "font-size": '11px',
              "font-family": inspectorStyles.sectionTitle["font-family"],
              color: 'var(--app-accent, #38bdf8)',
              background: 'rgba(56, 189, 248, 0.08)',
              padding: '4px 8px',
              "border-radius": '6px',
              border: '1px solid rgba(56, 189, 248, 0.2)'
            }}>
              <span style={{ opacity: 0.75 }}>↳ Resolved:</span>
              <span style={{ "font-family": 'inherit', "font-weight": '600' }}>
                {String(resolvedVal() ?? '')}
              </span>
            </div>
          )}
        </>
      )}
    </>
  );
}
