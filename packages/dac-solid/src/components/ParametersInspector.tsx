import { For, Show } from 'solid-js';

export function DocumentParametersInspector(props: {
  parameters: () => Record<string, any> | undefined;
  builder: () => any;
}) {
  const paramEntries = () => Object.entries(props.parameters() || {});

  return (
    <Show when={paramEntries().length > 0}>
      <div style={{ "margin-top": '16px', "border-top": '1px solid var(--app-border, #475569)', "padding-top": '12px' }}>
        <p style={{ "font-size": '12px', "font-weight": 'bold', "margin-bottom": '12px', color: 'var(--app-text, white)' }}>
          Parameters
        </p>
        <For each={paramEntries()}>
          {([key, param]) => {
            const label = param.label || key;
            const currentValue = () => param.value !== undefined ? param.value : param.default;
            const options = param.options;

            return (
              <div style={{ "margin-bottom": '12px' }}>
                <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: 'var(--app-text-muted, #94a3b8)' }}>
                  {label}
                </label>
                {options && options.length > 0 ? (
                  <select
                    value={String(currentValue() ?? '')}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      props.builder().mutateDocument((d: any) => {
                        if (!d.parameters) d.parameters = {};
                        if (!d.parameters[key]) d.parameters[key] = {};
                        d.parameters[key].value = val;
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'var(--app-bg-main, #0f172a)',
                      border: '1px solid var(--app-border, #475569)',
                      color: 'var(--app-text, white)',
                      "border-radius": '4px',
                      "box-sizing": 'border-box'
                    }}
                  >
                    <For each={options}>
                      {(opt: any) => (
                        <option value={opt.value}>
                          {opt.label || opt.value}
                        </option>
                      )}
                    </For>
                  </select>
                ) : param.type === 'boolean' || typeof param.default === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(currentValue())}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      props.builder().mutateDocument((d: any) => {
                        if (!d.parameters) d.parameters = {};
                        if (!d.parameters[key]) d.parameters[key] = {};
                        d.parameters[key].value = checked;
                      });
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(currentValue() ?? '')}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      props.builder().mutateDocument((d: any) => {
                        if (!d.parameters) d.parameters = {};
                        if (!d.parameters[key]) d.parameters[key] = {};
                        d.parameters[key].value = val;
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'var(--app-bg-main, #0f172a)',
                      border: '1px solid var(--app-border, #475569)',
                      color: 'var(--app-text, white)',
                      "border-radius": '4px',
                      "box-sizing": 'border-box'
                    }}
                  />
                )}
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}

export function ConstructReferenceInspector(props: {
  shape: () => any;
  currentId: string;
  nestedDocs?: () => Map<string, any> | undefined;
  updateShape: (id: string, properties: any) => void;
}) {
  const constructDoc = () => {
    const s = props.shape();
    if (!s || s.type !== 'ConstructReference' || !s.constructId) return null;
    return props.nestedDocs?.()?.get(s.constructId) || null;
  };

  const constructParams = () => {
    const cDoc = constructDoc();
    return cDoc?.parameters ? Object.entries(cDoc.parameters) : [];
  };

  return (
    <Show when={constructParams().length > 0}>
      <div style={{ "margin-top": '16px', "border-top": '1px solid var(--app-border, #475569)', "padding-top": '12px' }}>
        <p style={{ "font-size": '12px', "font-weight": 'bold', "margin-bottom": '4px', color: 'var(--app-text, white)' }}>
          Construct Parameters
        </p>
        <p style={{ "font-size": '10px', color: 'var(--app-text-muted, #94a3b8)', "margin-bottom": '12px' }}>
          Reference: {props.shape()?.constructId}
        </p>

        <For each={constructParams()}>
          {([key, param]: [string, any]) => {
            const label = param.label || key;
            const currentValue = () => {
              const overrides = props.shape()?.parameterOverrides;
              if (overrides && overrides[key] !== undefined) return overrides[key];
              return param.value !== undefined ? param.value : param.default;
            };
            const options = param.options;

            return (
              <div style={{ "margin-bottom": '12px' }}>
                <label style={{ display: 'block', "margin-bottom": '4px', "font-size": '12px', color: 'var(--app-text-muted, #94a3b8)' }}>
                  {label}
                </label>
                {options && options.length > 0 ? (
                  <select
                    value={String(currentValue() ?? '')}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      const currentOverrides = props.shape()?.parameterOverrides || {};
                      props.updateShape(props.currentId, {
                        parameterOverrides: {
                          ...currentOverrides,
                          [key]: val
                        }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'var(--app-bg-main, #0f172a)',
                      border: '1px solid var(--app-border, #475569)',
                      color: 'var(--app-text, white)',
                      "border-radius": '4px',
                      "box-sizing": 'border-box'
                    }}
                  >
                    <For each={options}>
                      {(opt: any) => (
                        <option value={opt.value}>
                          {opt.label || opt.value}
                        </option>
                      )}
                    </For>
                  </select>
                ) : param.type === 'boolean' || typeof param.default === 'boolean' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(currentValue())}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      const currentOverrides = props.shape()?.parameterOverrides || {};
                      props.updateShape(props.currentId, {
                        parameterOverrides: {
                          ...currentOverrides,
                          [key]: checked
                        }
                      });
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(currentValue() ?? '')}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      const currentOverrides = props.shape()?.parameterOverrides || {};
                      props.updateShape(props.currentId, {
                        parameterOverrides: {
                          ...currentOverrides,
                          [key]: val
                        }
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'var(--app-bg-main, #0f172a)',
                      border: '1px solid var(--app-border, #475569)',
                      color: 'var(--app-text, white)',
                      "border-radius": '4px',
                      "box-sizing": 'border-box'
                    }}
                  />
                )}
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}
