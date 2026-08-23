import { VisualizerUI } from '../index';

export class CanvasManager {
  public setupListeners() {}

  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  public updateZoomPan() {
    if (this.ui.svgWrapper) {
      this.ui.svgWrapper.style.transform = `translate(${this.ui.panX}px, ${this.ui.panY}px) scale(${this.ui.zoom})`;
    }
    this.ui.interactionManager.updateOverlayPositions();
  }

  public resetView() {
    this.ui.selectedComponentIds.clear();
    this.ui.primaryComponentType = null;

    // Temporarily disable transition for synchronous measurement
    const origTransition = this.ui.svgWrapper.style.transition;
    this.ui.svgWrapper.style.transition = 'none';
    this.ui.zoom = 1.0;
    this.ui.panX = 0;
    this.ui.panY = 0;
    this.updateZoomPan();

    const extentsEl = this.ui.svgWrapper.querySelector('.drawing-extents') as SVGElement | null;
    if (extentsEl && this.ui.svgViewport) {
      const viewportRect = this.ui.svgViewport.getBoundingClientRect();
      const extentsRect = extentsEl.getBoundingClientRect();

      if ((extentsRect.width > 0 || extentsRect.height > 0) && viewportRect.width > 0 && viewportRect.height > 0) {
        const padding = 60; // 30px padding on edges
        const availableWidth = Math.max(10, viewportRect.width - padding);
        const availableHeight = Math.max(10, viewportRect.height - padding);

        const scaleX = extentsRect.width > 0 ? availableWidth / extentsRect.width : 10.0;
        const scaleY = extentsRect.height > 0 ? availableHeight / extentsRect.height : 10.0;
        const newZoom = Math.max(0.05, Math.min(10.0, Math.min(scaleX, scaleY)));

        const extentsCenterX = (extentsRect.left - viewportRect.left) + extentsRect.width / 2;
        const extentsCenterY = (extentsRect.top - viewportRect.top) + extentsRect.height / 2;

        this.ui.zoom = newZoom;
        this.ui.panX = (viewportRect.width / 2) - extentsCenterX * this.ui.zoom;
        this.ui.panY = (viewportRect.height / 2) - extentsCenterY * this.ui.zoom;
      }
    }

    // Restore transition
    this.ui.svgWrapper.style.transition = origTransition;
    this.ui.render();
  }
}
