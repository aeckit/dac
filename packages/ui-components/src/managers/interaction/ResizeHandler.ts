import { VisualizerUI } from '../../index';
import { resolveScaleMultiplier } from '@dac/json-solver';

export class ResizeHandler {
  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  public setup() {
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

        let finalProps: any = null;

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
             finalProps = {
               x1: Math.round((startCompX1 + svgDx) * 1000) / 1000,
               y1: Math.round((startCompY1 - svgDy) * 1000) / 1000
             };
             this.ui.engine.updateComponent(comp.componentId, finalProps, true);
             return;
          }
          if (dir === 'line-end') {
             finalProps = {
               x2: Math.round((startCompX2 + svgDx) * 1000) / 1000,
               y2: Math.round((startCompY2 - svgDy) * 1000) / 1000
             };
             this.ui.engine.updateComponent(comp.componentId, finalProps, true);
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

          finalProps = {
            x: Math.round(newX * 1000) / 1000,
            y: Math.round(newY * 1000) / 1000,
            width: Math.round(newW * 1000) / 1000,
            height: Math.round(newH * 1000) / 1000
          };
          
          const isImage = this.ui.primaryComponentType === 'CAD::Annotation::Image' || this.ui.primaryComponentType === 'Image';
          
          if (this.ui.primaryComponentType === 'CAD::Viewport') {
            const cropDx = (newX - startCompX) / vpScale;
            const cropDy = (newY - startCompY) / vpScale;
            finalProps.cropX = Math.round((startCropX + cropDx) * 1000) / 1000;
            finalProps.cropY = Math.round((startCropY + cropDy) * 1000) / 1000;
          } else if (isImage && this.ui.croppingComponentId === comp.componentId) {
            const cropDx = (newX - startCompX);
            const cropDy = (newY - startCompY);
            finalProps.cropX = Math.round((startCropX + cropDx) * 1000) / 1000;
            finalProps.cropY = Math.round((startCropY + cropDy) * 1000) / 1000;
          } else if (isImage) {
            const scaleX = newW / startCompW;
            const scaleY = newH / startCompH;
            finalProps.cropX = Math.round(startCropX * scaleX * 1000) / 1000;
            finalProps.cropY = Math.round(startCropY * scaleY * 1000) / 1000;
            finalProps.imgWidth = Math.round(startImgW * scaleX * 1000) / 1000;
            finalProps.imgHeight = Math.round(startImgH * scaleY * 1000) / 1000;
          }

          this.ui.engine.updateComponent(comp.componentId, finalProps, true);
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          if (finalProps) {
            this.ui.engine.updateComponent(comp.componentId, finalProps, false);
          }
          setTimeout(() => { this.ui.isDragging = false; }, 0);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
      
      grabber.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
  }
}
