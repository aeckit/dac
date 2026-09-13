import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { useDac } from '../hooks/useDac';

export function SelectionGizmo() {
  const { selectionIds, deleteShape, updateShape, selectedShape, zoom } = useDac();
  const [box, setBox] = createSignal<{ left: number, top: number, right: number, bottom: number, isLine?: boolean, p1?: {x: number, y: number}, p2?: {x: number, y: number} } | null>(null);

  let reqId: number;

  const handleDrag = (e: PointerEvent, mode: string) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Capture initial state
    const shape = selectedShape();
    if (!shape) return;
    const initial = { 
      x: shape.x, y: shape.y, w: shape.width, h: shape.height,
      x1: shape.x1, y1: shape.y1, x2: shape.x2, y2: shape.y2 
    };

    const container = document.querySelector('[data-canvas-container]') as HTMLElement;
    const rootSvg = container?.querySelector('svg');
    const selectedEl = rootSvg?.querySelector(`[data-component-id="${shape.componentId}"]`);
    const parentEl = (selectedEl?.parentElement as unknown as SVGGraphicsElement) || rootSvg;
    if (!rootSvg || !parentEl) return;

    const ctm = parentEl.getScreenCTM();
    if (!ctm) return;
    const inverse = ctm.inverse();

    const onMove = (moveEvt: PointerEvent) => {
      const ptStart = rootSvg.createSVGPoint();
      ptStart.x = startX;
      ptStart.y = startY;
      const svgStart = ptStart.matrixTransform(inverse);

      const ptCurrent = rootSvg.createSVGPoint();
      ptCurrent.x = moveEvt.clientX;
      ptCurrent.y = moveEvt.clientY;
      const svgCurrent = ptCurrent.matrixTransform(inverse);

      const dx = svgCurrent.x - svgStart.x;
      const dy = svgCurrent.y - svgStart.y;

      const isLineShape = shape.type === 'Line' || shape.type === 'CAD::Shape::Line';

      if (mode === 'move') {
        if (isLineShape) {
          updateShape(shape.componentId, { 
            x1: initial.x1 + dx, 
            y1: initial.y1 - dy,
            x2: initial.x2 + dx,
            y2: initial.y2 - dy 
          }, true);
        } else {
          updateShape(shape.componentId, { x: initial.x + dx, y: initial.y - dy }, true);
        }
      } else if (mode === 'line-start') {
        updateShape(shape.componentId, { x1: initial.x1 + dx, y1: initial.y1 - dy }, true);
      } else if (mode === 'line-end') {
        updateShape(shape.componentId, { x2: initial.x2 + dx, y2: initial.y2 - dy }, true);
      } else {
        let newX = initial.x;
        let newY = initial.y;
        let newW = initial.w;
        let newH = initial.h;

        if (mode.includes('w')) {
          newX = initial.x + dx;
          newW = initial.w - dx;
        }
        if (mode.includes('e')) {
          newW = initial.w + dx;
        }
        if (mode.includes('n')) {
          newH = initial.h - dy;
        }
        if (mode.includes('s')) {
          newY = initial.y - dy;
          newH = initial.h + dy;
        }

        const minSize = 0.1;
        if (newW < minSize) {
          if (mode.includes('w')) newX -= (minSize - newW);
          newW = minSize;
        }
        if (newH < minSize) {
          if (mode.includes('s')) newY -= (minSize - newH);
          newH = minSize;
        }

        updateShape(shape.componentId, { x: newX, y: newY, width: newW, height: newH }, true);
      }
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      // Finalize transient state
      updateShape(shape.componentId, {}, false);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

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
    
    let isLine = false;
    let p1, p2;

    ids.forEach(id => {
      const el = rootSvg.querySelector(`[data-component-id="${id}"]`) as SVGGraphicsElement;
      if (!el) return;
      
      const type = el.getAttribute('data-component-type');
      const screenCTM = el.getScreenCTM();

      if (ids.length === 1 && (type === 'Line' || type === 'CAD::Shape::Line')) {
        isLine = true;
        const lineNode = el.querySelector('line');
        if (lineNode && screenCTM) {
          const pt1 = rootSvg.createSVGPoint(); pt1.x = lineNode.x1.baseVal.value; pt1.y = lineNode.y1.baseVal.value;
          const pt2 = rootSvg.createSVGPoint(); pt2.x = lineNode.x2.baseVal.value; pt2.y = lineNode.y2.baseVal.value;
          if (typeof pt1.matrixTransform === 'function') {
            const mPt1 = pt1.matrixTransform(screenCTM);
            const mPt2 = pt2.matrixTransform(screenCTM);
            p1 = { x: mPt1.x - containerRect.left, y: mPt1.y - containerRect.top };
            p2 = { x: mPt2.x - containerRect.left, y: mPt2.y - containerRect.top };
          }
        }
      }

      let bbox;
      try { bbox = el.getBBox(); } catch(e) { return; }
      
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
        bottom: maxY - containerRect.top,
        isLine, p1, p2
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
        <div data-selection-gizmo="true" style={{ position: 'absolute', "pointer-events": 'none', "z-index": 100, left: 0, top: 0, width: '100%', height: '100%' }}>
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
              onPointerDown={(e) => handleDrag(e, 'move')}
              style={{ background: '#3b82f6', color: 'white', border: 'none', "border-radius": '4px', width: '24px', height: '24px', cursor: 'move', display: 'flex', "align-items": 'center', "justify-content": 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
            </button>
          </div>

          {selectedShape()?.type === 'CAD::Viewport' && (
            <div style={{ position: 'absolute', left: `${b().right - 80}px`, top: `${b().top - 36}px`, "pointer-events": 'auto' }}>
              <button 
                onClick={() => {
                  const shape = selectedShape();
                  if (shape && typeof shape.detail === 'string') {
                    let filename = shape.detail;
                    if (filename.startsWith('../')) filename = filename.substring(3);
                    if (filename !== 'inline-detail') {
                      window.dispatchEvent(new CustomEvent('dac-open-file', { detail: { filename } }));
                    }
                  }
                }}
                style={{ background: '#10b981', color: 'white', border: 'none', "border-radius": '4px', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', "align-items": 'center', "justify-content": 'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </button>
            </div>
          )}

          {/* Bounding Box Border */}
          {!b().isLine && (
            <div style={{
              position: 'absolute',
              left: `${b().left}px`,
              top: `${b().top}px`,
              width: `${b().right - b().left}px`,
              height: `${b().bottom - b().top}px`,
              border: '2px solid #3b82f6',
            }} />
          )}

          {/* 8 Resize Handles or Line Handles */}
          {!b().isLine ? ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((dir) => {
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
              <div 
                onPointerDown={(e) => handleDrag(e, dir)}
                style={{
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
                }} 
              />
            );
          }) : (
            <>
              {b().p1 && (
                <div 
                  onPointerDown={(e) => handleDrag(e, 'line-start')}
                  style={{
                    position: 'absolute', left: `${b().p1!.x}px`, top: `${b().p1!.y}px`, width: '8px', height: '8px',
                    background: 'white', border: '1px solid #3b82f6', transform: 'translate(-50%, -50%)',
                    "pointer-events": 'auto', cursor: 'pointer'
                  }} 
                />
              )}
              {b().p2 && (
                <div 
                  onPointerDown={(e) => handleDrag(e, 'line-end')}
                  style={{
                    position: 'absolute', left: `${b().p2!.x}px`, top: `${b().p2!.y}px`, width: '8px', height: '8px',
                    background: 'white', border: '1px solid #3b82f6', transform: 'translate(-50%, -50%)',
                    "pointer-events": 'auto', cursor: 'pointer'
                  }} 
                />
              )}
            </>
          )}
        </div>
      )}
    </Show>
  );
}
