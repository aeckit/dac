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
          <div class="precise-input-wrapper" style="display: flex; gap: 4px; align-items: center;">
            <input type="color" class="color-picker-input" value="${getHex(shape.color)}" style="width: 24px; height: 24px; padding: 0; border: 1px solid #475569; border-radius: 3px; cursor: pointer; flex-shrink: 0; background: none;" />
            <input type="text" class="precise-input shape-color-input" value="${shape.color || ''}" placeholder="#f1f5f9" style="flex: 1; min-width: 0;" />
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
          const colorPicker = input.previousElementSibling as HTMLInputElement;
          if (colorPicker && colorPicker.classList.contains('color-picker-input')) {
            input.addEventListener('input', () => {
              const val = input.value;
              if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                colorPicker.value = val;
              }
            });
            colorPicker.addEventListener('change', () => {
              input.value = colorPicker.value;
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
