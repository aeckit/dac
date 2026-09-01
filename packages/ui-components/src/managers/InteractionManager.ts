import { VisualizerUI } from '../index';
import { resolveScaleMultiplier, explodeConstruct } from '@aeckit/core-solver';

export class InteractionManager {
  public setupListeners() {
    this.ui.btnDeleteOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this.ui.interactionManager.deleteSelectedComponent();
    });

    window.addEventListener('explode-construct', (e: any) => {
      if (!e.detail || !e.detail.componentId) return;
      const cid = e.detail.componentId;
      const doc = this.ui.findDocumentForComponent(cid);
      if (!doc || !doc.geometry || !Array.isArray(doc.geometry)) return;

      const idx = doc.geometry.findIndex((s: any, index: number) => {
        const shapeId = s.componentId || 'shape_' + index;
        return shapeId === cid;
      });

      if (idx !== -1) {
        const shape = doc.geometry[idx];
        if (shape.type === 'ConstructReference' && this.ui.options.constructResolver && shape.constructId) {
          const constructDoc = this.ui.options.constructResolver(shape.constructId);
          if (constructDoc) {
            const globalParams: Record<string, number | boolean> = {};
            if (doc.parameters) {
              for (const [key, param] of Object.entries(doc.parameters)) {
                globalParams[key] = param.value !== undefined ? param.value : param.default;
                if (param.options) {
                  const val = globalParams[key];
                  const selectedOpt = param.options.find((opt: any) => opt.value === val);
                  if (selectedOpt && selectedOpt.variables) {
                    for (const [vKey, vVal] of Object.entries(selectedOpt.variables)) {
                      globalParams[`${key}.${vKey}`] = vVal as any;
                    }
                  }
                }
              }
            }
            const explodedShapes = explodeConstruct(shape, constructDoc, globalParams);
            doc.geometry.splice(idx, 1, ...explodedShapes);
            this.ui.selectedComponentIds.clear();
            
            // Select the newly exploded shapes
            explodedShapes.forEach(s => {
              if (s.componentId) this.ui.selectedComponentIds.add(s.componentId);
            });
            this.ui.primaryComponentType = 'ConstructExploded';
            this.ui.updateAndNotify();
          }
        }
      }
    });

    this.ui.btnMoveOverlay.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (this.ui.selectedComponentIds.size === 0) return;

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      
      const rootSvg = this.ui.svgWrapper?.querySelector('svg');
      if (!rootSvg) return;

      const initialStates = new Map<string, any>();
      this.ui.selectedComponentIds.forEach(cid => {
        let comp = null;
        if (this.ui.primaryComponentType === 'CAD::Viewport') {
          const sheet = this.ui.getActiveSheet();
          comp = sheet?.viewports?.find(v => v.componentId === cid) || null;
        } else {
          const doc = this.ui.findDocumentForComponent(cid);
          if (doc && doc.geometry) {
            let autoIndex = 0;
            comp = doc.geometry.find(s => {
              const sid = s.componentId || 'shape_' + autoIndex++;
              return sid === cid;
            }) || null;
          }
        }
        
        if (comp) {
          const isLine = (comp as any).type === 'Line' || (comp as any).type === 'CAD::Shape::Line' || (comp as any).componentType === 'Line';
          initialStates.set(cid, {
            comp,
            isLine,
            x: Number(comp.x) || 0,
            y: Number(comp.y) || 0,
            x1: Number((comp as any).x1) || 0,
            y1: Number((comp as any).y1) || 0,
            x2: Number((comp as any).x2) || 0,
            y2: Number((comp as any).y2) || 0,
          });
        }
      });

      if (initialStates.size === 0) return;

      const firstCid = Array.from(this.ui.selectedComponentIds)[0];
      const selectedEl = this.ui.svgWrapper?.querySelector(`[data-component-id="${firstCid}"]`);
      const parentEl = (selectedEl?.parentElement as unknown as SVGGraphicsElement) || rootSvg;
      const ctm = parentEl.getScreenCTM();
      if (!ctm) return;
      const inverse = ctm.inverse();

      const onMouseMove = (moveEvt: MouseEvent) => {
        this.ui.isDragging = true;
        
        const ptStart = rootSvg.createSVGPoint();
        ptStart.x = startMouseX;
        ptStart.y = startMouseY;
        const svgStart = ptStart.matrixTransform(inverse);

        const ptCurrent = rootSvg.createSVGPoint();
        ptCurrent.x = moveEvt.clientX;
        ptCurrent.y = moveEvt.clientY;
        const svgCurrent = ptCurrent.matrixTransform(inverse);

        const svgDx = svgCurrent.x - svgStart.x;
        const svgDy = svgCurrent.y - svgStart.y;

        initialStates.forEach(state => {
          if (state.isLine) {
            (state.comp as any).x1 = Math.round((state.x1 + svgDx) * 1000) / 1000;
            (state.comp as any).y1 = Math.round((state.y1 - svgDy) * 1000) / 1000;
            (state.comp as any).x2 = Math.round((state.x2 + svgDx) * 1000) / 1000;
            (state.comp as any).y2 = Math.round((state.y2 - svgDy) * 1000) / 1000;
          } else {
            state.comp.x = Math.round((state.x + svgDx) * 1000) / 1000;
            state.comp.y = Math.round((state.y - svgDy) * 1000) / 1000;
          }
        });

        this.ui.render();
      };

      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        this.ui.updateAndNotify();
        setTimeout(() => { this.ui.isDragging = false; }, 0);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    this.ui.btnMoveOverlay.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent click from bubbling
    });

    this.ui.btnOpenOverlay.addEventListener('mousedown', (e) => e.stopPropagation());
    this.ui.btnOpenOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.ui.primaryComponentType === 'CAD::Viewport') {
        const sheet = this.ui.getActiveSheet();
        if (!sheet) return;
        const cid = Array.from(this.ui.selectedComponentIds)[0];
        const vp = sheet.viewports?.find(v => v.componentId === cid);
        if (vp && typeof vp.detail === 'string') {
          let filename = vp.detail;
          if (filename.startsWith('../')) {
            filename = filename.substring(3);
          }
          if (filename !== 'inline-detail') {
            window.dispatchEvent(new CustomEvent('dac-open-file', { detail: { filename } }));
          }
        }
      }
    });

    this.ui.btnCropOverlay.addEventListener('mousedown', (e) => e.stopPropagation());
    this.ui.btnDeleteOverlay.addEventListener('mousedown', (e) => e.stopPropagation());

    this.ui.btnCropOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      const comp = this.ui.getSelectedShape();
      if (comp && (this.ui.primaryComponentType === 'CAD::Annotation::Image' || this.ui.primaryComponentType === 'Image')) {
        const isCrop = this.ui.croppingComponentId === comp.componentId;
        
        if (isCrop) {
          this.ui.croppingComponentId = null;
        } else {
          this.ui.croppingComponentId = comp.componentId;
        }
        
        this.ui.updateAndNotify();
        this.ui.render();
      }
    });

    Object.entries(this.ui.grabbers).forEach(([dir, grabber]) => {
      grabber.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const comp = this.ui.getSelectedShape();
        if (!comp) return;

        const startMouseX = e.clientX;
        const startMouseY = e.clientY;
        const startCompX = Number(comp.x) || 0;
        const startCompY = Number(comp.y) || 0;
        const startCompW = Number(comp.width) || 0;
        const startCompH = Number(comp.height) || 0;
        const startCropX = Number((comp as any).cropX) || 0;
        const startCropY = Number((comp as any).cropY) || 0;
        const startImgW = Number((comp as any).imgWidth) || startCompW;
        const startImgH = Number((comp as any).imgHeight) || startCompH;
        const startCompX1 = Number((comp as any).x1) || 0;
        const startCompY1 = Number((comp as any).y1) || 0;
        const startCompX2 = Number((comp as any).x2) || 0;
        const startCompY2 = Number((comp as any).y2) || 0;

        const onMouseMove = (moveEvt: MouseEvent) => {
          this.ui.isDragging = true;
          const rootSvg = this.ui.svgWrapper?.querySelector('svg');
          if (!rootSvg) return;

          const singleCid = Array.from(this.ui.selectedComponentIds)[0];
          const selectedEl = this.ui.svgWrapper?.querySelector(`[data-component-id="${singleCid}"]`);
          const parentEl = (selectedEl?.parentElement as unknown as SVGGraphicsElement) || rootSvg;
          const ctm = parentEl.getScreenCTM();
          if (!ctm) return;

          const inverse = ctm.inverse();

          const ptStart = rootSvg.createSVGPoint();
          ptStart.x = startMouseX;
          ptStart.y = startMouseY;
          const svgStart = ptStart.matrixTransform(inverse);

          const ptCurrent = rootSvg.createSVGPoint();
          ptCurrent.x = moveEvt.clientX;
          ptCurrent.y = moveEvt.clientY;
          const svgCurrent = ptCurrent.matrixTransform(inverse);

          const svgDx = svgCurrent.x - svgStart.x;
          // SVG Dy is positive when dragging DOWN on the screen
          const svgDy = svgCurrent.y - svgStart.y;
          
          if (dir === 'line-start') {
             (comp as any).x1 = Math.round((startCompX1 + svgDx) * 1000) / 1000;
             (comp as any).y1 = Math.round((startCompY1 - svgDy) * 1000) / 1000;
             this.ui.render();
             return;
          }
          if (dir === 'line-end') {
             (comp as any).x2 = Math.round((startCompX2 + svgDx) * 1000) / 1000;
             (comp as any).y2 = Math.round((startCompY2 - svgDy) * 1000) / 1000;
             this.ui.render();
             return;
          }

          let newX = startCompX;
          let newY = startCompY;
          let newW = startCompW;
          let newH = startCompH;

          let vpScale = 1;
          if (this.ui.primaryComponentType === 'CAD::Viewport') {
             vpScale = resolveScaleMultiplier((comp as any).scale || '1:1');
          }

          // West (Left) edge dragging
          if (dir.includes('w')) {
            newX = startCompX + svgDx;
            newW = startCompW - svgDx;
          }
          // East (Right) edge dragging
          if (dir.includes('e')) {
            newW = startCompW + svgDx;
          }
          // North (Top) edge dragging
          if (dir.includes('n')) {
            newH = startCompH - svgDy;
          }
          // South (Bottom) edge dragging
          if (dir.includes('s')) {
            newY = startCompY - svgDy;
            newH = startCompH + svgDy;
          }

          if ((comp as any).lockAspectRatio) {
            const aspect = startCompW / startCompH;
            const ratioX = newW / startCompW;
            const ratioY = newH / startCompH;
            
            // Determine which axis drives the scale
            let driveW = true;
            if (dir === 'n' || dir === 's') driveW = false;
            else if (dir === 'e' || dir === 'w') driveW = true;
            else driveW = Math.abs(ratioX - 1) > Math.abs(ratioY - 1);

            if (driveW) {
              const lockedH = newW / aspect;
              if (dir.includes('n')) {
                // For North (Top), top edge (Y+H) changes, bottom edge (Y) is anchored
                newH = lockedH;
              }
              if (dir.includes('s')) {
                // For South (Bottom), top edge (Y+H) is anchored, bottom edge (Y) moves
                const topEdge = startCompY + startCompH;
                newH = lockedH;
                newY = topEdge - newH;
              }
            } else {
              const lockedW = newH * aspect;
              if (dir.includes('e')) {
                // For East (Right), left edge (X) is anchored
                newW = lockedW;
              }
              if (dir.includes('w')) {
                // For West (Left), right edge (X+W) is anchored
                const rightEdge = startCompX + startCompW;
                newW = lockedW;
                newX = rightEdge - newW;
              }
            }
          }

          // Enforce minimum dimensions
          const minSize = 0.1;
          if (newW < minSize) {
             const diff = minSize - newW;
             if (dir.includes('w')) {
                newX -= diff;
             }
             newW = minSize;
          }
          if (newH < minSize) {
             const diff = minSize - newH;
             if (dir.includes('s')) {
                newY -= diff;
             }
             newH = minSize;
          }

          comp.x = Math.round(newX * 1000) / 1000;
          comp.y = Math.round(newY * 1000) / 1000;
          comp.width = Math.round(newW * 1000) / 1000;
          comp.height = Math.round(newH * 1000) / 1000;
          
          const isImage = this.ui.primaryComponentType === 'CAD::Annotation::Image' || this.ui.primaryComponentType === 'Image';
          
          if (this.ui.primaryComponentType === 'CAD::Viewport') {
            const cropDx = (newX - startCompX) / vpScale;
            const cropDy = (newY - startCompY) / vpScale;
            (comp as any).cropX = Math.round((startCropX + cropDx) * 1000) / 1000;
            (comp as any).cropY = Math.round((startCropY + cropDy) * 1000) / 1000;
          } else if (isImage && this.ui.croppingComponentId === comp.componentId) {
            const cropDx = (newX - startCompX);
            const cropDy = (newY - startCompY);
            (comp as any).cropX = Math.round((startCropX + cropDx) * 1000) / 1000;
            (comp as any).cropY = Math.round((startCropY + cropDy) * 1000) / 1000;
          } else if (isImage) {
            const scaleX = newW / startCompW;
            const scaleY = newH / startCompH;
            (comp as any).cropX = Math.round(startCropX * scaleX * 1000) / 1000;
            (comp as any).cropY = Math.round(startCropY * scaleY * 1000) / 1000;
            (comp as any).imgWidth = Math.round(startImgW * scaleX * 1000) / 1000;
            (comp as any).imgHeight = Math.round(startImgH * scaleY * 1000) / 1000;
          }

          this.ui.render();
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          this.ui.updateAndNotify();
          setTimeout(() => { this.ui.isDragging = false; }, 0);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
      
      grabber.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

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
        if (this.ui.doc.type === 'CAD::Project') {
          return;
        }

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
                this.ui.selectedComponentIds.forEach(id => newSelection.add(id));
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
                  if (cid) {
                    if (upEvt.shiftKey || upEvt.metaKey) {
                      if (newSelection.has(cid)) newSelection.delete(cid);
                      else newSelection.add(cid);
                    } else {
                      newSelection.add(cid);
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
              if (cid) {
                if (upEvt.shiftKey || upEvt.metaKey) {
                  if (this.ui.selectedComponentIds.has(cid)) this.ui.selectedComponentIds.delete(cid);
                  else this.ui.selectedComponentIds.add(cid);
                } else {
                  this.ui.selectedComponentIds.clear();
                  this.ui.selectedComponentIds.add(cid);
                }
                this.ui.updatePrimaryComponentType();
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

  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  public updateOverlayPositions() {
    if (this.ui.selectedComponentIds.size === 0 || !this.ui.svgWrapper) {
      if (this.ui.btnMoveOverlay) this.ui.btnMoveOverlay.style.display = 'none';
      if (this.ui.btnCropOverlay) this.ui.btnCropOverlay.style.display = 'none';
      if (this.ui.btnDeleteOverlay) this.ui.btnDeleteOverlay.style.display = 'none';
      if (this.ui.btnOpenOverlay) this.ui.btnOpenOverlay.style.display = 'none';
      if (this.ui.grabbers) Object.values(this.ui.grabbers).forEach(g => g.style.display = 'none');
      return;
    }

    const rootSvg = this.ui.svgWrapper.querySelector('svg');
    if (!rootSvg) return;

    if (this.ui.selectedComponentIds.size > 1) {
      if (this.ui.btnCropOverlay) this.ui.btnCropOverlay.style.display = 'none';
      if (this.ui.btnOpenOverlay) this.ui.btnOpenOverlay.style.display = 'none';
      if (this.ui.grabbers) Object.values(this.ui.grabbers).forEach(g => g.style.display = 'none');

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const containerRect = this.ui.svgViewport.getBoundingClientRect();

      this.ui.selectedComponentIds.forEach(id => {
        const el = this.ui.svgWrapper?.querySelector(`[data-component-id="${id}"]`) as SVGGraphicsElement;
        if (!el) return;
        const bbox = el.getBBox();
        const screenCTM = el.getScreenCTM();
        if (!screenCTM) return;

        const tl = rootSvg.createSVGPoint(); tl.x = bbox.x; tl.y = bbox.y;
        const tr = rootSvg.createSVGPoint(); tr.x = bbox.x + bbox.width; tr.y = bbox.y;
        const bl = rootSvg.createSVGPoint(); bl.x = bbox.x; bl.y = bbox.y + bbox.height;
        const br = rootSvg.createSVGPoint(); br.x = bbox.x + bbox.width; br.y = bbox.y + bbox.height;

        if (typeof tl.matrixTransform === 'function') {
          const pts = [tl, tr, bl, br].map(p => p.matrixTransform(screenCTM));
          pts.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
        }
      });

      if (minX === Infinity) return;

      const pxTop = minY - containerRect.top;
      const pxRight = maxX - containerRect.left;

      this.ui.btnMoveOverlay.style.display = 'flex';
      this.ui.btnMoveOverlay.style.left = `${pxRight - 52}px`;
      this.ui.btnMoveOverlay.style.top = `${pxTop - 36}px`;

      this.ui.btnDeleteOverlay.style.display = 'flex';
      this.ui.btnDeleteOverlay.style.left = `${pxRight - 24}px`;
      this.ui.btnDeleteOverlay.style.top = `${pxTop - 36}px`;
      return;
    }

    const cid = Array.from(this.ui.selectedComponentIds)[0];
    const selectedEl = this.ui.svgWrapper.querySelector(`[data-component-id="${cid}"]`) as SVGGraphicsElement;
    if (!selectedEl) {
      if (this.ui.btnMoveOverlay) this.ui.btnMoveOverlay.style.display = 'none';
      if (this.ui.btnCropOverlay) this.ui.btnCropOverlay.style.display = 'none';
      if (this.ui.btnDeleteOverlay) this.ui.btnDeleteOverlay.style.display = 'none';
      if (this.ui.btnOpenOverlay) this.ui.btnOpenOverlay.style.display = 'none';
      if (this.ui.grabbers) Object.values(this.ui.grabbers).forEach(g => g.style.display = 'none');
      return;
    }

    // Get bounding box in SVG coordinate space
    let bbox = selectedEl.getBBox();
    
    // For viewports, align to the viewport frame border rather than the title label if it exists
    if (this.ui.primaryComponentType === 'CAD::Viewport') {
      const borderRect = selectedEl.querySelector('rect[stroke="#475569"]') as SVGGElement | null;
      if (borderRect) {
        bbox = borderRect.getBBox();
      }
    }

    
    const rootSvgEl = this.ui.svgWrapper.querySelector('svg');
    if (!rootSvgEl) return;
    
    const screenCTM = selectedEl.getScreenCTM();
    if (!screenCTM) return;

    const isLine = this.ui.primaryComponentType === 'Line' || this.ui.primaryComponentType === 'CAD::Shape::Line';
    let pts: DOMPoint[] = [];

    if (isLine) {
      const lineNode = selectedEl.querySelector('line');
      if (lineNode) {
        const pStart = rootSvgEl.createSVGPoint(); pStart.x = lineNode.x1.baseVal.value; pStart.y = lineNode.y1.baseVal.value;
        const pEnd = rootSvgEl.createSVGPoint(); pEnd.x = lineNode.x2.baseVal.value; pEnd.y = lineNode.y2.baseVal.value;
        if (typeof pStart.matrixTransform === 'function') {
          pts = [pStart.matrixTransform(screenCTM), pEnd.matrixTransform(screenCTM)];
        }
      }
    } else {
      const tl = rootSvgEl.createSVGPoint(); tl.x = bbox.x; tl.y = bbox.y;
      const tr = rootSvgEl.createSVGPoint(); tr.x = bbox.x + bbox.width; tr.y = bbox.y;
      const bl = rootSvgEl.createSVGPoint(); bl.x = bbox.x; bl.y = bbox.y + bbox.height;
      const br = rootSvgEl.createSVGPoint(); br.x = bbox.x + bbox.width; br.y = bbox.y + bbox.height;

      // Handle JSDOM test environment where matrixTransform is missing
      if (typeof tl.matrixTransform === 'function') {
        pts = [tl, tr, bl, br].map(p => p.matrixTransform(screenCTM));
      }
    }

    if (pts.length === 0) return;

    const screenMinX = Math.min(...pts.map(p => p.x));
    const screenMaxX = Math.max(...pts.map(p => p.x));
    const screenMinY = Math.min(...pts.map(p => p.y));
    const screenMaxY = Math.max(...pts.map(p => p.y));

    // Convert from browser screen coordinates to the overlay container coordinates
    const containerRect = this.ui.svgViewport.getBoundingClientRect();
    const pxLeft = screenMinX - containerRect.left;
    const pxTop = screenMinY - containerRect.top;
    const pxRight = screenMaxX - containerRect.left;
    const pxBottom = screenMaxY - containerRect.top;

    this.ui.btnMoveOverlay.style.display = 'flex';
    this.ui.btnMoveOverlay.style.left = `${pxRight - 52}px`;
    this.ui.btnMoveOverlay.style.top = `${pxTop - 36}px`;

    const isImage = this.ui.primaryComponentType === 'CAD::Annotation::Image' || this.ui.primaryComponentType === 'Image';
    if (isImage) {
      this.ui.btnCropOverlay.style.display = 'flex';
      this.ui.btnCropOverlay.style.left = `${pxRight - 80}px`;
      this.ui.btnCropOverlay.style.top = `${pxTop - 36}px`;
      
      const comp = this.ui.getSelectedShape();
      const isCrop = comp && this.ui.croppingComponentId === comp.componentId;
      this.ui.btnCropOverlay.style.background = isCrop ? '#3b82f6' : '#1e293b';
      this.ui.btnCropOverlay.style.borderColor = isCrop ? '#2563eb' : '#475569';
      
      if (isCrop) {
        this.ui.editOverlay.classList.add('crop-mode');
      } else {
        this.ui.editOverlay.classList.remove('crop-mode');
      }
    } else {
      this.ui.btnCropOverlay.style.display = 'none';
      this.ui.editOverlay.classList.remove('crop-mode');
    }

    this.ui.btnDeleteOverlay.style.display = 'flex';
    this.ui.btnDeleteOverlay.style.left = `${pxRight - 24}px`;
    this.ui.btnDeleteOverlay.style.top = `${pxTop - 36}px`;

    if (this.ui.primaryComponentType === 'CAD::Viewport') {
      this.ui.btnOpenOverlay.style.display = 'flex';
      this.ui.btnOpenOverlay.style.left = `${pxRight - 80}px`;
      this.ui.btnOpenOverlay.style.top = `${pxTop - 36}px`;
    } else {
      this.ui.btnOpenOverlay.style.display = 'none';
    }

    const canResize = this.ui.primaryComponentType === 'Rectangle' || this.ui.primaryComponentType === 'CAD::Shape::Rectangle' || this.ui.primaryComponentType === 'CAD::Viewport' || this.ui.primaryComponentType === 'Image' || this.ui.primaryComponentType === 'CAD::Annotation::Image';
    
    if (isLine && pts.length === 2) {
      const pxLeft0 = pts[0].x - containerRect.left;
      const pxTop0 = pts[0].y - containerRect.top;
      const pxLeft1 = pts[1].x - containerRect.left;
      const pxTop1 = pts[1].y - containerRect.top;

      this.ui.grabbers['line-start'].style.left = `${pxLeft0}px`; this.ui.grabbers['line-start'].style.top = `${pxTop0}px`;
      this.ui.grabbers['line-end'].style.left = `${pxLeft1}px`; this.ui.grabbers['line-end'].style.top = `${pxTop1}px`;
      
      this.ui.grabbers['line-start'].style.display = 'block';
      this.ui.grabbers['line-end'].style.display = 'block';
      
      ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(d => {
        if (this.ui.grabbers[d]) this.ui.grabbers[d].style.display = 'none';
      });
    } else if (canResize) {
      const cx = (pxLeft + pxRight) / 2;
      const cy = (pxTop + pxBottom) / 2;
      
      this.ui.grabbers['nw'].style.left = `${pxLeft}px`; this.ui.grabbers['nw'].style.top = `${pxTop}px`;
      this.ui.grabbers['n'].style.left = `${cx}px`; this.ui.grabbers['n'].style.top = `${pxTop}px`;
      this.ui.grabbers['ne'].style.left = `${pxRight}px`; this.ui.grabbers['ne'].style.top = `${pxTop}px`;
      this.ui.grabbers['e'].style.left = `${pxRight}px`; this.ui.grabbers['e'].style.top = `${cy}px`;
      this.ui.grabbers['se'].style.left = `${pxRight}px`; this.ui.grabbers['se'].style.top = `${pxBottom}px`;
      this.ui.grabbers['s'].style.left = `${cx}px`; this.ui.grabbers['s'].style.top = `${pxBottom}px`;
      this.ui.grabbers['sw'].style.left = `${pxLeft}px`; this.ui.grabbers['sw'].style.top = `${pxBottom}px`;
      this.ui.grabbers['w'].style.left = `${pxLeft}px`; this.ui.grabbers['w'].style.top = `${cy}px`;
      
      Object.values(this.ui.grabbers).forEach(g => {
        if (g.getAttribute('data-dir') !== 'line-start' && g.getAttribute('data-dir') !== 'line-end') {
          g.style.display = 'block';
        }
      });
      if (this.ui.grabbers['line-start']) this.ui.grabbers['line-start'].style.display = 'none';
      if (this.ui.grabbers['line-end']) this.ui.grabbers['line-end'].style.display = 'none';
    } else {
      Object.values(this.ui.grabbers).forEach(g => g.style.display = 'none');
    }
  }

  public deleteSelectedComponent() {
    if (this.ui.selectedComponentIds.size === 0) return;
    
    let hasDeleted = false;

    this.ui.selectedComponentIds.forEach(cid => {
      let deleted = false;
      
      const activeSheet = this.ui.getActiveSheet();
      if (activeSheet && activeSheet.viewports) {
        const idx = activeSheet.viewports.findIndex(v => v.componentId === cid);
        if (idx > -1) {
          activeSheet.viewports.splice(idx, 1);
          deleted = true;
        }
      }

      if (!deleted) {
        const doc = this.ui.findDocumentForComponent(cid);
        if (doc && doc.geometry) {
          let autoIndex = 0;
          const idx = doc.geometry.findIndex(shape => {
            const sid = shape.componentId || 'shape_' + autoIndex++;
            return sid === cid;
          });
          if (idx > -1) {
            doc.geometry.splice(idx, 1);
            deleted = true;
          }
        }
      }
      
      if (deleted) hasDeleted = true;
    });

    if (hasDeleted) {
      this.ui.selectedComponentIds.clear();
      this.ui.primaryComponentType = null;
      this.ui.updateAndNotify();
    }
  }
}
