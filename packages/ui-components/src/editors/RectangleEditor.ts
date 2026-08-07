import { PropertyEditorContext, PropertyEditor } from './types';

export const RectangleEditor: PropertyEditor = {
  renderHTML(shape: any, index: number): string {
    return `
      <div class="form-group" data-shape-index="${index}">
        <div class="control-label-row">
          <label class="control-label">X Position</label>
          <input type="text" class="precise-input shape-x-input" value="${shape.x !== undefined ? shape.x : ''}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Y Position</label>
          <input type="text" class="precise-input shape-y-input" value="${shape.y !== undefined ? shape.y : ''}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Width</label>
          <input type="text" class="precise-input shape-width-input" value="${shape.width !== undefined ? shape.width : ''}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Height</label>
          <input type="text" class="precise-input shape-height-input" value="${shape.height !== undefined ? shape.height : ''}" />
        </div>
        
        <div style="border-top: 1px solid var(--vscode-widget-border); margin: 12px 0;"></div>
        
        <div class="control-label-row">
          <label class="control-label">Fill</label>
          <input type="text" class="precise-input shape-fill-input" value="${shape.fill || ''}" placeholder="e.g. #ff0000 or none" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Hatch</label>
          <select class="precise-input shape-hatch-input">
            <option value="" ${!shape.hatch ? 'selected' : ''}>None</option>
            <option value="Concrete" ${shape.hatch === 'Concrete' ? 'selected' : ''}>Concrete</option>
            <option value="TimberCross" ${shape.hatch === 'TimberCross' ? 'selected' : ''}>TimberCross</option>
          </select>
        </div>
        
        <div style="border-top: 1px solid var(--vscode-widget-border); margin: 12px 0;"></div>
        
        <div class="control-label-row">
          <label class="control-label">Stroke Color</label>
          <input type="text" class="precise-input shape-color-input" value="${shape.color || ''}" placeholder="#f8fafc" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Stroke Width</label>
          <input type="number" class="precise-input shape-strokewidth-input" min="0.5" max="20" step="0.5" value="${shape.strokeWidth || 2}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Dash Array</label>
          <input type="text" class="precise-input shape-dash-input" value="${shape.strokeDasharray || ''}" placeholder="e.g. 5,5" />
        </div>
      </div>
    `;
  },

  bindListeners(context: PropertyEditorContext): void {
    const { container, shapeIndex, getLatestShape, updateAndNotify } = context;
    const groupEl = container.querySelector(`[data-shape-index="${shapeIndex}"]`) as HTMLElement;
    if (!groupEl) return;

    const bindStringInput = (selector: string, propName: string) => {
      const input = groupEl.querySelector(selector) as HTMLInputElement | HTMLSelectElement;
      if (input) {
        input.addEventListener('change', () => {
          const currentShape = getLatestShape();
          if (currentShape) {
            // Numbers typed in text inputs for x/y/width/height should be converted to numbers if they are purely numeric
            let val: any = input.value;
            if (propName === 'x' || propName === 'y' || propName === 'width' || propName === 'height') {
              if (val !== '' && !isNaN(Number(val))) {
                val = Number(val);
              }
            }
            if (val === '') {
              delete currentShape[propName];
            } else {
              currentShape[propName] = val;
            }
            updateAndNotify();
          }
        });
      }
    };

    const bindNumberInput = (selector: string, propName: string) => {
      const input = groupEl.querySelector(selector) as HTMLInputElement;
      if (input) {
        input.addEventListener('change', () => {
          const val = parseFloat(input.value);
          if (!isNaN(val) && val > 0) {
            const currentShape = getLatestShape();
            if (currentShape) {
              currentShape[propName] = val;
              updateAndNotify();
            }
          }
        });
      }
    };

    bindStringInput('.shape-x-input', 'x');
    bindStringInput('.shape-y-input', 'y');
    bindStringInput('.shape-width-input', 'width');
    bindStringInput('.shape-height-input', 'height');
    bindStringInput('.shape-fill-input', 'fill');
    bindStringInput('.shape-hatch-input', 'hatch');
    bindStringInput('.shape-color-input', 'color');
    bindNumberInput('.shape-strokewidth-input', 'strokeWidth');
    bindStringInput('.shape-dash-input', 'strokeDasharray');
  }
};
