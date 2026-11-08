import { createEffect, For } from 'solid-js';
import { inspectorStyles, MONO_FONT } from './inspectorStyles';

export interface PointsFieldProps {
  points: () => [number | string, number | string][];
  currentId: string;
  updateShape: (id: string, properties: any) => void;
}

function CoordinateInput(props: {
  value: () => number | string;
  onChange: (val: number | string) => void;
  placeholder?: string;
}) {
  let ref!: HTMLInputElement;

  createEffect(() => {
    const v = props.value();
    if (ref && document.activeElement !== ref) {
      ref.value = v !== undefined && v !== null ? String(v) : '';
    }
  });

  return (
    <input
      ref={ref}
      type="text"
      placeholder={props.placeholder || '0'}
      onInput={(e) => {
        const raw = e.currentTarget.value.trim();
        if (raw === '' || raw === '-' || raw.endsWith('.') || raw === '.') {
          return;
        }
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && String(parsed) === raw) {
          props.onChange(parsed);
        } else {
          props.onChange(raw);
        }
      }}
      onChange={(e) => {
        const raw = e.currentTarget.value.trim();
        const parsed = parseFloat(raw);
        if (!isNaN(parsed) && String(parsed) === raw) {
          props.onChange(parsed);
        } else if (raw !== '') {
          props.onChange(raw);
        } else {
          props.onChange(0);
        }
      }}
      style={{
        ...inspectorStyles.input,
        padding: '3px 6px',
        "font-size": '11px',
        flex: 1,
        "min-width": '0'
      }}
    />
  );
}

export function PointsField(props: PointsFieldProps) {
  const points = () => props.points() || [];

  const handleUpdateCoord = (index: number, coordIdx: 0 | 1, newVal: number | string) => {
    const current = points();
    const updated = current.map((pt, i) => {
      if (i === index) {
        return coordIdx === 0 ? [newVal, pt[1]] : [pt[0], newVal];
      }
      return pt;
    });
    props.updateShape(props.currentId, { points: updated });
  };

  const handleAddPoint = () => {
    const current = points();
    let nextPoint: [number, number] = [0, 0];
    if (current.length >= 2) {
      const last = current[current.length - 1];
      const prev = current[current.length - 2];
      const dx = Number(last[0]) - Number(prev[0]);
      const dy = Number(last[1]) - Number(prev[1]);
      nextPoint = [
        Number(last[0]) + (!isNaN(dx) ? dx : 4),
        Number(last[1]) + (!isNaN(dy) ? dy : 0)
      ];
    } else if (current.length === 1) {
      nextPoint = [Number(current[0][0]) + 4, Number(current[0][1])];
    }
    const updated = [...current, nextPoint];
    props.updateShape(props.currentId, { points: updated });
  };

  const handleDeletePoint = (index: number) => {
    const current = points();
    if (current.length <= 2) return;
    const updated = current.filter((_, i) => i !== index);
    props.updateShape(props.currentId, { points: updated });
  };

  return (
    <div style={{ "margin-bottom": '12px' }}>
      <label style={{ ...inspectorStyles.label, "margin-bottom": '6px' }}>
        Points ({points().length})
      </label>

      <div style={{ display: 'flex', "flex-direction": 'column', gap: '6px' }}>
        <For each={points()}>
          {(pt, index) => (
            <div style={{ display: 'flex', "align-items": 'center', gap: '6px' }}>
              <span style={{ "font-size": '10px', "font-weight": '600', color: 'var(--app-text-muted, #94a3b8)', width: '18px', "text-align": 'right' }}>
                #{index() + 1}
              </span>
              <span style={{ "font-size": '10px', color: 'var(--app-text-muted, #94a3b8)' }}>X</span>
              <CoordinateInput value={() => pt[0]} onChange={(v) => handleUpdateCoord(index(), 0, v)} />
              <span style={{ "font-size": '10px', color: 'var(--app-text-muted, #94a3b8)' }}>Y</span>
              <CoordinateInput value={() => pt[1]} onChange={(v) => handleUpdateCoord(index(), 1, v)} />
              <button
                disabled={points().length <= 2}
                onClick={() => handleDeletePoint(index())}
                title={points().length <= 2 ? 'Minimum 2 points required' : `Delete vertex ${index() + 1}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: points().length <= 2 ? 'var(--app-border, #475569)' : '#ef4444',
                  cursor: points().length <= 2 ? 'not-allowed' : 'pointer',
                  "font-size": '14px',
                  "line-height": '1',
                  padding: '2px 4px',
                  opacity: points().length <= 2 ? 0.35 : 0.8
                }}
              >
                ×
              </button>
            </div>
          )}
        </For>
      </div>

      <button
        onClick={handleAddPoint}
        title="Add Point"
        style={{
          display: 'flex',
          "align-items": 'center',
          "justify-content": 'center',
          gap: '4px',
          width: '100%',
          padding: '5px 10px',
          background: 'var(--app-bg-main, #0f172a)',
          border: '1px dashed var(--app-border, #475569)',
          color: 'var(--app-accent, #38bdf8)',
          "border-radius": '6px',
          cursor: 'pointer',
          "font-family": MONO_FONT,
          "font-size": '11px',
          "font-weight": '500',
          "margin-top": '6px'
        }}
      >
        + Add Point
      </button>
    </div>
  );
}
