import { PropertyEditorContext, PropertyEditor } from './types';

const getHex = (c: any) => (typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c)) ? c : '#000000';

export const TextEditor: PropertyEditor = {
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
        
        <div style="border-top: 1px solid var(--vscode-widget-border); margin: 12px 0;"></div>
        
        <label class="control-label">Text Content</label>
        <textarea class="precise-input shape-text-input" style="width: 100%; min-height: 60px; font-family: monospace; margin-top: 6px; padding: 6px; box-sizing: border-box; background: var(--vscode-input-background, #1e293b); color: var(--vscode-input-foreground, #f8fafc); border: 1px solid var(--vscode-input-border, #334155); border-radius: 4px;">${shape.text || ''}</textarea>
        
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Font Size (pt)</label>
          <input type="number" class="precise-input shape-fontsize-input" min="4" max="144" step="1" value="${shape.fontSize || 11}" />
        </div>
        <div class="control-label-row">
          <label class="control-label">Text Color</label>
          <div class="precise-input color-input-wrapper" style="display: flex; gap: 6px; align-items: center; padding: 2px 4px;">
            <div class="color-swatch-container" style="position: relative; width: 16px; height: 16px; border-radius: 2px; border: 1px solid #475569; overflow: hidden; flex-shrink: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.2);">
              <div class="color-swatch-bg" style="position: absolute; inset: 0; background-color: ${getHex(shape.color)}; pointer-events: none;"></div>
              <input type="color" class="color-picker-input" value="${getHex(shape.color)}" style="position: absolute; opacity: 0; cursor: pointer; width: 200%; height: 200%; left: -50%; top: -50%;" />
            </div>
            <input type="text" class="shape-color-input" value="${shape.color || ''}" placeholder="#f1f5f9" style="flex: 1; min-width: 0; background: transparent; border: none; color: inherit; font-family: inherit; font-size: inherit; outline: none; padding: 0;" />
          </div>
        </div>
      </div>
    `;
  },

  bindListeners(context: PropertyEditorContext): void {
    const { container, shapeIndex, getLatestShape, updateAndNotify } = context;
    const groupEl = container.querySelector(`[data-shape-index="${shapeIndex}"]`) as HTMLElement;
    if (!groupEl) return;

    const bindStringInput = (selector: string, propName: string, isColor = false) => {
      const input = groupEl.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
      if (input) {
        input.addEventListener('change', () => {
          const currentShape = getLatestShape();
          if (currentShape) {
            let val: any = input.value;
            if (propName === 'x' || propName === 'y') {
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

    bindStringInput('.shape-x-input', 'x');
    bindStringInput('.shape-y-input', 'y');
    bindStringInput('.shape-text-input', 'text');
    bindStringInput('.shape-color-input', 'color', true);
    bindNumberInput('.shape-fontsize-input', 'fontSize');
  }
};
