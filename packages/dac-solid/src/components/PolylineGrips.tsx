import { For } from 'solid-js';

export interface PolylineGripsProps {
  points: { x: number; y: number; index: number }[];
  midpoints: { x: number; y: number; index: number }[];
  onDragVertex: (e: PointerEvent, index: number) => void;
  onDragMidpoint: (e: PointerEvent, index: number) => void;
  onDeleteVertex: (e: MouseEvent, index: number) => void;
}

export function PolylineGrips(props: PolylineGripsProps) {
  return (
    <>
      {/* Midpoint Split Grips (Add Vertex) */}
      <For each={props.midpoints}>
        {(mid) => (
          <div
            onPointerDown={(e) => props.onDragMidpoint(e, mid.index)}
            title={`Insert vertex between points ${mid.index + 1} and ${mid.index + 2}`}
            style={{
              position: 'absolute',
              left: `${mid.x}px`,
              top: `${mid.y}px`,
              width: '8px',
              height: '8px',
              background: 'rgba(59, 130, 246, 0.45)',
              border: '1.5px solid #3b82f6',
              transform: 'translate(-50%, -50%) rotate(45deg)',
              "pointer-events": 'auto',
              cursor: 'crosshair',
              "border-radius": '1px',
              "box-shadow": '0 1px 3px rgba(0,0,0,0.25)',
              transition: 'background 0.15s, transform 0.15s',
              "z-index": 11
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3b82f6';
              e.currentTarget.style.transform = 'translate(-50%, -50%) rotate(45deg) scale(1.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.45)';
              e.currentTarget.style.transform = 'translate(-50%, -50%) rotate(45deg)';
            }}
          />
        )}
      </For>

      {/* Vertex Grips (Move / Delete Vertex) */}
      <For each={props.points}>
        {(pt) => (
          <div
            onPointerDown={(e) => props.onDragVertex(e, pt.index)}
            onDblClick={(e) => props.onDeleteVertex(e, pt.index)}
            title={`Vertex ${pt.index + 1}: drag to move, double-click to remove`}
            style={{
              position: 'absolute',
              left: `${pt.x}px`,
              top: `${pt.y}px`,
              width: '10px',
              height: '10px',
              background: 'white',
              border: '2px solid #2563eb',
              "border-radius": '2px',
              transform: 'translate(-50%, -50%)',
              "pointer-events": 'auto',
              cursor: 'move',
              "box-shadow": '0 1px 4px rgba(0,0,0,0.3)',
              transition: 'border-color 0.15s, transform 0.15s',
              "z-index": 12
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#0284c7';
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2563eb';
              e.currentTarget.style.transform = 'translate(-50%, -50%)';
            }}
          />
        )}
      </For>
    </>
  );
}
