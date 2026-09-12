import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { useDac } from '../hooks/useDac';

export function SelectionGizmo() {
  const { selectionIds, deleteShape } = useDac();
  const [box, setBox] = createSignal<{ left: number, top: number, right: number, bottom: number } | null>(null);

  let reqId: number;

  const updateBounds = () => {
    const ids = selectionIds();
    if (ids.length === 0) {
      setBox(null);
      reqId = requestAnimationFrame(updateBounds);
      return;
    }

    const container = document.querySelector('[data-canvas-container]') as HTMLElement;
    const rootSvg = container?.querySelector('svg');
    if (!container || !rootSvg) {
      reqId = requestAnimationFrame(updateBounds);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    ids.forEach(id => {
      const el = rootSvg.querySelector(`[data-component-id="${id}"]`) as SVGGraphicsElement;
      if (!el) return;
      
      let bbox;
      try { bbox = el.getBBox(); } catch(e) { return; }
      
      const screenCTM = el.getScreenCTM();
      if (!screenCTM) return;

      const tl = rootSvg.createSVGPoint(); tl.x = bbox.x; tl.y = bbox.y;
      const tr = rootSvg.createSVGPoint(); tr.x = bbox.x + bbox.width; tr.y = bbox.y;
      const bl = rootSvg.createSVGPoint(); bl.x = bbox.x; bl.y = bbox.y + bbox.height;
      const br = rootSvg.createSVGPoint(); br.x = bbox.x + bbox.width; br.y = bbox.y + bbox.height;

      if (typeof tl.matrixTransform === 'function') {
        [tl, tr, bl, br].map(p => p.matrixTransform(screenCTM)).forEach(p => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      }
    });

    if (minX !== Infinity) {
      setBox({
        left: minX - containerRect.left,
        top: minY - containerRect.top,
        right: maxX - containerRect.left,
        bottom: maxY - containerRect.top
      });
    } else {
      setBox(null);
    }

    reqId = requestAnimationFrame(updateBounds);
  };

  onMount(() => {
    reqId = requestAnimationFrame(updateBounds);
  });

  onCleanup(() => {
    cancelAnimationFrame(reqId);
  });

  return (
    <Show when={box()}>
      {(b) => (
        <div style={{ position: 'absolute', "pointer-events": 'none', "z-index": 100, left: 0, top: 0, width: '100%', height: '100%' }}>
          {/* Action Buttons */}
          <div style={{ position: 'absolute', left: `${b().right - 24}px`, top: `${b().top - 36}px`, "pointer-events": 'auto' }}>
            <button 
              onClick={() => {
                selectionIds().forEach(id => deleteShape(id));
              }}
              style={{ background: '#ef4444', color: 'white', border: 'none', "border-radius": '4px', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', "align-items": 'center', "justify-content": 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
          </div>
          
          <div style={{ position: 'absolute', left: `${b().right - 52}px`, top: `${b().top - 36}px`, "pointer-events": 'auto' }}>
             <button 
              style={{ background: '#3b82f6', color: 'white', border: 'none', "border-radius": '4px', width: '24px', height: '24px', cursor: 'move', display: 'flex', "align-items": 'center', "justify-content": 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
            </button>
          </div>

          {/* Bounding Box Border */}
          <div style={{
            position: 'absolute',
            left: `${b().left}px`,
            top: `${b().top}px`,
            width: `${b().right - b().left}px`,
            height: `${b().bottom - b().top}px`,
            border: '2px solid #3b82f6',
          }} />

          {/* 8 Resize Handles */}
          {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((dir) => {
            let hLeft = 0, hTop = 0;
            const cx = (b().left + b().right) / 2;
            const cy = (b().top + b().bottom) / 2;
            
            if (dir.includes('w')) hLeft = b().left;
            else if (dir.includes('e')) hLeft = b().right;
            else hLeft = cx;

            if (dir.includes('n')) hTop = b().top;
            else if (dir.includes('s')) hTop = b().bottom;
            else hTop = cy;

            return (
              <div style={{
                position: 'absolute',
                left: `${hLeft}px`,
                top: `${hTop}px`,
                width: '8px',
                height: '8px',
                background: 'white',
                border: '1px solid #3b82f6',
                transform: 'translate(-50%, -50%)',
                "pointer-events": 'auto',
                cursor: `${dir}-resize`
              }} />
            );
          })}
        </div>
      )}
    </Show>
  );
}
