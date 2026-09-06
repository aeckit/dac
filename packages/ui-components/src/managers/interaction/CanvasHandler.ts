import { VisualizerUI } from '../../index';

export class CanvasHandler {
  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  public setup() {
    this.ui.svgViewport.addEventListener('contextmenu', (e) => e.preventDefault());

    this.ui.svgViewport.addEventListener('mousedown', (e) => {
      // 1. PANNING (Middle or Right Click)
      if (e.button === 1 || e.button === 2) {
        this.ui.isDragging = false;
        this.ui.startX = e.clientX - this.ui.panX;
        this.ui.startY = e.clientY - this.ui.panY;
        this.ui.svgViewport.style.cursor = 'grabbing';

        const onMouseMove = (moveEvt: MouseEvent) => {
          this.ui.isDragging = true;
          this.ui.panX = moveEvt.clientX - this.ui.startX;
          this.ui.panY = moveEvt.clientY - this.ui.startY;
          this.ui.canvasManager.updateZoomPan();
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          this.ui.svgViewport.style.cursor = 'crosshair';
          setTimeout(() => { this.ui.isDragging = false; }, 50);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return;
      }

      // 2. SELECTION (Left Click)
      if (e.button === 0) {
        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        let isSelecting = false;
        let selectionBox: SVGRectElement | null = null;
        const rootSvg = this.ui.svgWrapper?.querySelector('svg');

        const onMouseMove = (moveEvt: MouseEvent) => {
          const dx = moveEvt.clientX - startMouseX;
          const dy = moveEvt.clientY - startMouseY;
          if (!isSelecting && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
            isSelecting = true;
            this.ui.isDragging = true;
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

        const onMouseUp = (upEvt: MouseEvent) => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          if (isSelecting) {
            if (selectionBox) {
              const boxRect = selectionBox.getBoundingClientRect();
              selectionBox.remove();
              
              const newSelection = new Set<string>();
              if (upEvt.shiftKey || upEvt.metaKey) {
                this.ui.selectedComponentIds.forEach((id: string) => newSelection.add(id));
              }

              const interactives = this.ui.svgWrapper.querySelectorAll('.interactive-component');
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
                    if (this.ui.isProject() && cType === 'CAD::Viewport') {
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
              
              this.ui.selectedComponentIds = newSelection;
              this.ui.updatePrimaryComponentType();
              if (this.ui.options.onSelectionChange) this.ui.options.onSelectionChange(this.ui.getSelectedComponentIds(), this.ui.primaryComponentType);
              this.ui.render();
            }
            setTimeout(() => { this.ui.isDragging = false; }, 50);
          } else {
            // Just a click
            const target = e.target as SVGElement;
            const interactiveGroup = target.closest('.interactive-component') as SVGGElement | null;
            
            if (interactiveGroup) {
              const cid = interactiveGroup.getAttribute('data-component-id');
              const cType = interactiveGroup.getAttribute('data-component-type');
              if (cid) {
                if (this.ui.isProject() && cType === 'CAD::Viewport') {
                  // Block viewport selection in Project view
                  this.ui.selectedComponentIds.clear();
                  this.ui.primaryComponentType = null;
                } else {
                  if (upEvt.shiftKey || upEvt.metaKey) {
                    if (this.ui.selectedComponentIds.has(cid)) this.ui.selectedComponentIds.delete(cid);
                    else this.ui.selectedComponentIds.add(cid);
                  } else {
                    this.ui.selectedComponentIds.clear();
                    this.ui.selectedComponentIds.add(cid);
                  }
                  this.ui.updatePrimaryComponentType();
                }
              }
              if (this.ui.options.onSelectionChange) this.ui.options.onSelectionChange(this.ui.getSelectedComponentIds(), this.ui.primaryComponentType);
              this.ui.render();
            } else {
              this.ui.selectedComponentIds.clear();
              this.ui.primaryComponentType = null;
              if (this.ui.options.onSelectionChange) this.ui.options.onSelectionChange([], null);
              this.ui.render();
            }
          }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      }
    });

    this.ui.svgViewport.addEventListener('wheel', (e) => {
      e.preventDefault();

      const rect = this.ui.svgViewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - this.ui.panX) / this.ui.zoom;
      const worldY = (mouseY - this.ui.panY) / this.ui.zoom;

      const zoomSpeed = 0.0012;
      const factor = 1 - e.deltaY * zoomSpeed;
      this.ui.zoom = Math.max(0.05, Math.min(10.0, this.ui.zoom * factor)); // Allow much wider zoom out for D-size sheets

      this.ui.panX = mouseX - worldX * this.ui.zoom;
      this.ui.panY = mouseY - worldY * this.ui.zoom;
      this.ui.canvasManager.updateZoomPan();
    });
  }
}
