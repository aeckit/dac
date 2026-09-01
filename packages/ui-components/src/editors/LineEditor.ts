import { PropertyEditorContext, PropertyEditor } from './types';

const getHex = (c: any) => (typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c)) ? c : '#000000';

export const LineEditor: PropertyEditor = {
  renderHTML(shape: any, index: number): string {
    return `
      <div class="form-group" data-shape-index="${index}">
        <div class="control-label-row">
          <label class="control-label">X1 Position</label>
          <input type="text" class="precise-input shape-x1-input" value="${shape.x1 !== undefined ? shape.x1 : ''}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Y1 Position</label>
          <input type="text" class="precise-input shape-y1-input" value="${shape.y1 !== undefined ? shape.y1 : ''}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">X2 Position</label>
          <input type="text" class="precise-input shape-x2-input" value="${shape.x2 !== undefined ? shape.x2 : ''}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Y2 Position</label>
          <input type="text" class="precise-input shape-y2-input" value="${shape.y2 !== undefined ? shape.y2 : ''}" />
        </div>
        
        <div style="border-top: 1px solid var(--vscode-widget-border); margin: 12px 0;"></div>
        
        <div class="control-label-row">
          <label class="control-label">Stroke Color</label>
          <div class="precise-input color-input-wrapper" style="display: flex; gap: 6px; align-items: center; padding: 2px 4px;">
            <div class="color-swatch-container" style="position: relative; width: 16px; height: 16px; border-radius: 2px; border: 1px solid #475569; overflow: hidden; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2);">
              <div class="color-swatch-bg" style="position: absolute; inset: 0; background-color: ${getHex(shape.color)}; pointer-events: none;"></div>
              <input type="color" class="color-picker-input" value="${getHex(shape.color)}" style="position: absolute; opacity: 0; cursor: pointer; width: 200%; height: 200%; left: -50%; top: -50%;" />
            </div>
            <input type="text" class="shape-color-input" value="${shape.color || ''}" placeholder="#f8fafc" style="flex: 1; min-width: 0; background: transparent; border: none; color: inherit; font-family: inherit; font-size: inherit; outline: none; padding: 0;" />
          </div>
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

    const bindStringInput = (selector: string, propName: string, isColor = false) => {
      const input = groupEl.querySelector(selector) as HTMLInputElement;
      if (input) {
        input.addEventListener('change', () => {
          const currentShape = getLatestShape();
          if (currentShape) {
            let val: any = input.value;
            if (propName === 'x1' || propName === 'y1' || propName === 'x2' || propName === 'y2') {
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
        if (isColor) {
          const wrapper = input.closest('.color-input-wrapper');
          const colorPicker = wrapper?.querySelector('.color-picker-input') as HTMLInputElement;
          const swatchBg = wrapper?.querySelector('.color-swatch-bg') as HTMLElement;
          if (colorPicker) {
            input.addEventListener('input', () => {
              const val = input.value;
              if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                colorPicker.value = val;
                if (swatchBg) swatchBg.style.backgroundColor = val;
              }
            });
            colorPicker.addEventListener('input', () => {
              input.value = colorPicker.value;
              if (swatchBg) swatchBg.style.backgroundColor = colorPicker.value;
            });
            colorPicker.addEventListener('change', () => {
              input.dispatchEvent(new Event('change'));
            });
          }
        }
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

    bindStringInput('.shape-x1-input', 'x1');
    bindStringInput('.shape-y1-input', 'y1');
    bindStringInput('.shape-x2-input', 'x2');
    bindStringInput('.shape-y2-input', 'y2');
    bindStringInput('.shape-color-input', 'color', true);
    bindNumberInput('.shape-strokewidth-input', 'strokeWidth');
    bindStringInput('.shape-dash-input', 'strokeDasharray');
  }
};
