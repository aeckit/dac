import { createSignal, createEffect, onMount } from 'solid-js';
import { useDac } from '../hooks/useDac';
import { renderDetail, renderSheet } from '@aeckit/dac-renderer-svg';

export function DacCanvas() {
  const { doc, nestedDocs, selectShape, zoom, setZoom, activeSheetId } = useDac();
  const [svgContent, setSvgContent] = createSignal('');
  let containerRef: HTMLDivElement | undefined;
  
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = createSignal(false);
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 });

  createEffect(() => {
    const document = doc();
    if (!document) return;

    try {
      if (document.type === 'CAD::Project') {
        const sheetId = activeSheetId();
        if (sheetId) {
          const sheet = nestedDocs()?.get(sheetId) || document.sheets?.find((s: any) => s.id === sheetId);
          if (sheet) {
             const viewportsMap = new Map();
             if (sheet.viewports) {
                sheet.viewports.forEach((vp: any) => {
                  const detailDoc = nestedDocs()?.get(vp.detailId);
                  if (detailDoc) viewportsMap.set(vp.detailId, detailDoc);
                });
             }
             const svg = renderSheet(sheet, document.projectData || {}, viewportsMap, undefined);
             setSvgContent(svg);
             return;
          }
        }
        setSvgContent('<svg><text x="50" y="50" fill="white">Select a sheet to view</text></svg>');
      } else {
        const svg = renderDetail(document as any, 24, 18, (id) => nestedDocs()?.get(id));
        setSvgContent(svg);
      }
    } catch (e: any) {
      console.error('Render error:', e);
      setSvgContent(`<svg><text x="50" y="50" fill="red">Render Error: ${e.message}</text></svg>`);
    }
  });

  const handlePointerDown = (e: PointerEvent) => {
    const target = e.target as HTMLElement;
    const componentEl = target.closest('[data-component-id]') as HTMLElement;
    if (componentEl) {
      const id = componentEl.dataset.componentId;
      if (id) {
        selectShape(id, e.shiftKey);
      }
    } else {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan().x, y: e.clientY - pan().y });
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (isDragging()) {
      setPan({
        x: e.clientX - dragStart().x,
        y: e.clientY - dragStart().y
      });
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.1, Math.min(10, z * delta)));
    } else {
      setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', "background-color": '#0f172a', position: 'relative' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <div 
        style={{ 
          "transform-origin": "0 0",
          transform: `translate(${pan().x}px, ${pan().y}px) scale(${zoom()})`,
          width: '100%',
          height: '100%'
        }}
        innerHTML={svgContent()}
      />
    </div>
  );
}
