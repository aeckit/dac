import { VisualizerUI } from '../../index';
import { explodeConstruct } from '@dac/json-solver';

export class ActionHandler {
  private ui: VisualizerUI;

  constructor(ui: VisualizerUI) {
    this.ui = ui;
  }

  public setup() {
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
            
            if (this.ui.engine) {
              this.ui.engine.replaceComponentWithShapes(cid, explodedShapes);
            } else {
              doc.geometry.splice(idx, 1, ...explodedShapes);
              this.ui.updateAndNotify();
            }
            
            this.ui.selectedComponentIds.clear();
            
            // Select the newly exploded shapes
            explodedShapes.forEach(s => {
              if (s.componentId) this.ui.selectedComponentIds.add(s.componentId);
            });
            this.ui.primaryComponentType = 'ConstructExploded';
            
            // If we don't have engine, we manually called updateAndNotify. If we do, the engine emitted document_changed which UI listens to and calls updateAndNotify. But we just updated selectedComponentIds. The render might have already run on document_changed, so we should call render to render the selection.
            this.ui.render();
          }
        }
      }
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
        this.ui.render();
      }
    });
  }
}
