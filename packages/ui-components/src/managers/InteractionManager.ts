import { VisualizerUI } from '../index';
import { ActionHandler } from './interaction/ActionHandler';
import { DragHandler } from './interaction/DragHandler';
import { ResizeHandler } from './interaction/ResizeHandler';
import { CanvasHandler } from './interaction/CanvasHandler';

export class InteractionManager {
  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  public setupListeners() {
    new ActionHandler(this.ui).setup();
    new DragHandler(this.ui).setup();
    new ResizeHandler(this.ui).setup();
    new CanvasHandler(this.ui).setup();
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
    
    this.ui.selectedComponentIds.forEach(cid => {
      try {
        this.ui.engine.deleteComponent(cid);
      } catch (e) {
        console.warn('Failed to delete component:', e);
      }
    });

    this.ui.selectedComponentIds.clear();
    this.ui.primaryComponentType = null;
    this.ui.render();
  }
}
