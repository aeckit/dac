import { VisualizerUI } from '../../index';

export class DragHandler {
  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  public setup() {
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
          const c: any = comp;
          const isLine = c.type === 'Line' || c.type === 'CAD::Shape::Line';
          initialStates.set(cid, {
            comp: c,
            isLine,
            x: Number(c.x) || 0,
            y: Number(c.y) || 0,
            x1: Number(c.x1) || 0,
            y1: Number(c.y1) || 0,
            x2: Number(c.x2) || 0,
            y2: Number(c.y2) || 0,
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
        
        const currentRootSvg = this.ui.svgWrapper?.querySelector('svg');
        if (!currentRootSvg) return;

        const ptStart = currentRootSvg.createSVGPoint();
        ptStart.x = startMouseX;
        ptStart.y = startMouseY;
        const svgStart = ptStart.matrixTransform(inverse);

        const ptCurrent = currentRootSvg.createSVGPoint();
        ptCurrent.x = moveEvt.clientX;
        ptCurrent.y = moveEvt.clientY;
        const svgCurrent = ptCurrent.matrixTransform(inverse);

        const svgDx = svgCurrent.x - svgStart.x;
        const svgDy = svgCurrent.y - svgStart.y;

        initialStates.forEach((state, cid) => {
          if (state.isLine) {
            this.ui.engine.updateComponent(cid, {
              x1: Math.round((state.x1 + svgDx) * 1000) / 1000,
              y1: Math.round((state.y1 - svgDy) * 1000) / 1000,
              x2: Math.round((state.x2 + svgDx) * 1000) / 1000,
              y2: Math.round((state.y2 - svgDy) * 1000) / 1000
            }, true);
          } else {
            this.ui.engine.updateComponent(cid, {
              x: Math.round((state.x + svgDx) * 1000) / 1000,
              y: Math.round((state.y - svgDy) * 1000) / 1000
            }, true);
          }
        });
      };

      const onMouseUp = (upEvt: MouseEvent) => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        
        const currentRootSvg = this.ui.svgWrapper?.querySelector('svg');
        if (!currentRootSvg) {
          setTimeout(() => { this.ui.isDragging = false; }, 0);
          return;
        }

        const ptStart = currentRootSvg.createSVGPoint();
        ptStart.x = startMouseX;
        ptStart.y = startMouseY;
        const svgStart = ptStart.matrixTransform(inverse);

        const ptCurrent = currentRootSvg.createSVGPoint();
        ptCurrent.x = upEvt.clientX;
        ptCurrent.y = upEvt.clientY;
        const svgCurrent = ptCurrent.matrixTransform(inverse);

        const svgDx = svgCurrent.x - svgStart.x;
        const svgDy = svgCurrent.y - svgStart.y;
        
        initialStates.forEach((state, cid) => {
          if (state.isLine) {
            this.ui.engine.updateComponent(cid, {
              x1: Math.round((state.x1 + svgDx) * 1000) / 1000,
              y1: Math.round((state.y1 - svgDy) * 1000) / 1000,
              x2: Math.round((state.x2 + svgDx) * 1000) / 1000,
              y2: Math.round((state.y2 - svgDy) * 1000) / 1000
            }, false); // Committed!
          } else {
            this.ui.engine.updateComponent(cid, {
              x: Math.round((state.x + svgDx) * 1000) / 1000,
              y: Math.round((state.y - svgDy) * 1000) / 1000
            }, false); // Committed!
          }
        });

        setTimeout(() => { this.ui.isDragging = false; }, 0);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    this.ui.btnMoveOverlay.addEventListener('click', (e) => {
      e.stopPropagation(); // prevent click from bubbling
    });
  }
}
