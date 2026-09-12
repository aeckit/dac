import { createSignal, createEffect, onMount } from 'solid-js';
import { useDac } from '../hooks/useDac';
import { renderDetail, renderSheet } from '@aeckit/dac-renderer-svg';
import { SelectionGizmo } from './SelectionGizmo';

export function DacCanvas() {
  const { doc, nestedDocs, selectionIds, setSelectionIds, zoom, setZoom, activeSheetId } = useDac();
  const [svgContent, setSvgContent] = createSignal('');
  let containerRef!: HTMLDivElement;
  let contentRef!: HTMLDivElement;
  
  const [pan, setPan] = createSignal({ x: 0, y: 0 });

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

  onMount(() => {
    if (!containerRef) return;

    containerRef.addEventListener('contextmenu', (e) => e.preventDefault());

    containerRef.addEventListener('wheel', (e) => {
      e.preventDefault();

      const rect = containerRef.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - pan().x) / zoom();
      const worldY = (mouseY - pan().y) / zoom();

      const zoomSpeed = 0.0012;
      const factor = 1 - e.deltaY * zoomSpeed;
      const newZoom = Math.max(0.05, Math.min(10.0, zoom() * factor));
      setZoom(newZoom);

      setPan({
        x: mouseX - worldX * newZoom,
        y: mouseY - worldY * newZoom
      });
    }, { passive: false });
  });

  const handlePointerDown = (e: PointerEvent) => {
    // 1. PANNING (Middle or Right Click)
    if (e.button === 1 || e.button === 2) {
      const startX = e.clientX - pan().x;
      const startY = e.clientY - pan().y;
      containerRef.style.cursor = 'grabbing';

      const onPointerMove = (moveEvt: PointerEvent) => {
        setPan({
          x: moveEvt.clientX - startX,
          y: moveEvt.clientY - startY
        });
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        containerRef.style.cursor = 'crosshair';
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      return;
    }

    // 2. SELECTION (Left Click)
    if (e.button === 0) {
      const initialTarget = e.target as SVGElement;
      if (initialTarget.closest('[data-selection-gizmo]')) return;
      
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      let isSelecting = false;
      let selectionBox: SVGRectElement | null = null;
      const rootSvg = contentRef.querySelector('svg');

      const onPointerMove = (moveEvt: PointerEvent) => {
        const dx = moveEvt.clientX - startMouseX;
        const dy = moveEvt.clientY - startMouseY;
        if (!isSelecting && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          isSelecting = true;
          if (rootSvg) {
            selectionBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            selectionBox.setAttribute('stroke-width', '1');
            selectionBox.setAttribute('vector-effect', 'non-scaling-stroke');
            rootSvg.appendChild(selectionBox);
          }
        }

        if (isSelecting && selectionBox && rootSvg) {
          const ctm = rootSvg.getScreenCTM();
          if (ctm) {
            const inverse = ctm.inverse();
            const ptStart = rootSvg.createSVGPoint();
            ptStart.x = startMouseX;
            ptStart.y = startMouseY;
            const svgStart = ptStart.matrixTransform(inverse);

            const ptCurrent = rootSvg.createSVGPoint();
            ptCurrent.x = moveEvt.clientX;
            ptCurrent.y = moveEvt.clientY;
            const svgCurrent = ptCurrent.matrixTransform(inverse);

            const x = Math.min(svgStart.x, svgCurrent.x);
            const y = Math.min(svgStart.y, svgCurrent.y);
            const w = Math.abs(svgCurrent.x - svgStart.x);
            const h = Math.abs(svgCurrent.y - svgStart.y);

            selectionBox.setAttribute('x', String(x));
            selectionBox.setAttribute('y', String(y));
            selectionBox.setAttribute('width', String(w));
            selectionBox.setAttribute('height', String(h));
            
            const isLeftToRight = moveEvt.clientX >= startMouseX;
            if (isLeftToRight) {
              selectionBox.setAttribute('fill', 'rgba(59, 130, 246, 0.2)');
              selectionBox.setAttribute('stroke', 'rgba(59, 130, 246, 0.8)');
              selectionBox.removeAttribute('stroke-dasharray');
            } else {
              selectionBox.setAttribute('fill', 'rgba(34, 197, 94, 0.2)');
              selectionBox.setAttribute('stroke', 'rgba(34, 197, 94, 0.8)');
              selectionBox.setAttribute('stroke-dasharray', '4,4');
            }
          }
        }
      };

      const onPointerUp = (upEvt: PointerEvent) => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);

        if (isSelecting) {
          if (selectionBox) {
            const boxRect = selectionBox.getBoundingClientRect();
            selectionBox.remove();
            
            const newSelection = new Set<string>();
            if (upEvt.shiftKey || upEvt.metaKey) {
              selectionIds().forEach((id: string) => newSelection.add(id));
            }

            const interactives = contentRef.querySelectorAll('.interactive-component');
            const isLeftToRight = upEvt.clientX >= startMouseX;
            
            interactives.forEach(group => {
              const groupRect = group.getBoundingClientRect();
              
              let isSelected = false;
              if (isLeftToRight) {
                isSelected = (
                  groupRect.left >= boxRect.left &&
                  groupRect.right <= boxRect.right &&
                  groupRect.top >= boxRect.top &&
                  groupRect.bottom <= boxRect.bottom
                );
              } else {
                isSelected = !(
                  groupRect.right < boxRect.left || 
                  groupRect.left > boxRect.right || 
                  groupRect.bottom < boxRect.top || 
                  groupRect.top > boxRect.bottom
                );
              }
              
              if (isSelected) {
                const cid = group.getAttribute('data-component-id');
                const cType = group.getAttribute('data-component-type');
                if (cid) {
                  const isProject = doc()?.type === 'CAD::Project';
                  if (isProject && cType === 'CAD::Viewport') {
                    // Block viewport selection in Project view
                  } else {
                    if (upEvt.shiftKey || upEvt.metaKey) {
                      if (newSelection.has(cid)) newSelection.delete(cid);
                      else newSelection.add(cid);
                    } else {
                      newSelection.add(cid);
                    }
                  }
                }
              }
            });
            
            setSelectionIds(Array.from(newSelection));
          }
        } else {
          // Just a click
          const interactiveGroup = initialTarget.closest('.interactive-component') as SVGGElement | null;
          
          if (interactiveGroup) {
            const cid = interactiveGroup.getAttribute('data-component-id');
            const cType = interactiveGroup.getAttribute('data-component-type');
            if (cid) {
              const isProject = doc()?.type === 'CAD::Project';
              if (isProject && cType === 'CAD::Viewport') {
                // Block viewport selection in Project view
                setSelectionIds([]);
              } else {
                if (upEvt.shiftKey || upEvt.metaKey) {
                  const current = new Set(selectionIds());
                  if (current.has(cid)) current.delete(cid);
                  else current.add(cid);
                  setSelectionIds(Array.from(current));
                } else {
                  setSelectionIds([cid]);
                }
              }
            }
          } else {
            setSelectionIds([]);
          }
        }
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    }
  };

  return (
    <div 
      ref={containerRef}
      data-canvas-container="true"
      style={{ width: '100%', height: '100%', overflow: 'hidden', "background-color": '#0f172a', position: 'relative', cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
    >
      <div 
        ref={contentRef}
        style={{ 
          "transform-origin": "0 0",
          transform: `translate(${pan().x}px, ${pan().y}px) scale(${zoom()})`,
          width: '100%',
          height: '100%'
        }}
        innerHTML={svgContent()}
      />
      <SelectionGizmo />
    </div>
  );
}
