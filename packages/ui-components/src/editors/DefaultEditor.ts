import { PropertyEditorContext, PropertyEditor } from './types';

export const DefaultEditor: PropertyEditor = {
  renderHTML(shape: any, index: number): string {
    const isTextShape = shape.text !== undefined || shape.type === 'CAD::Annotation::Text' || shape.type === 'CAD::Annotation::TextBox';
    
    if (isTextShape) {
      return `
        <div class="form-group" data-shape-index="${index}">
          <label class="control-label">Text Content</label>
          <textarea class="precise-input shape-text-input" style="width: 100%; min-height: 60px; font-family: monospace; margin-top: 6px; padding: 6px; box-sizing: border-box; background: var(--vscode-input-background, #1e293b); color: var(--vscode-input-foreground, #f8fafc); border: 1px solid var(--vscode-input-border, #334155); border-radius: 4px;">${shape.text || ''}</textarea>
          <div class="control-label-row" style="margin-top: 8px;">
            <label class="control-label">Font Size (pt)</label>
            <input type="number" class="precise-input shape-fontsize-input" min="4" max="144" step="1" value="${shape.fontSize || 11}" />
          </div>
        </div>
      `;
    } else {
      return `
        <div class="form-group" data-shape-index="${index}">
          <div class="control-label-row">
            <label class="control-label">Stroke Width</label>
            <input type="number" class="precise-input shape-strokewidth-input" min="0.5" max="20" step="0.5" value="${shape.strokeWidth || 2}" />
          </div>
        </div>
      `;
    }
  },

  bindListeners(context: PropertyEditorContext): void {
    const { container, shapeIndex, getLatestShape, updateAndNotify } = context;
    const groupEl = container.querySelector(`[data-shape-index="${shapeIndex}"]`) as HTMLElement;
    if (!groupEl) return;

    const textInput = groupEl.querySelector('.shape-text-input') as HTMLTextAreaElement;
    if (textInput) {
      textInput.addEventListener('change', () => {
        const currentShape = getLatestShape();
        if (currentShape) {
          currentShape.text = textInput.value;
          updateAndNotify();
        }
      });
    }

    const fontSizeInput = groupEl.querySelector('.shape-fontsize-input') as HTMLInputElement;
    if (fontSizeInput) {
      fontSizeInput.addEventListener('change', () => {
        const val = parseFloat(fontSizeInput.value);
        if (!isNaN(val) && val > 0) {
          const currentShape = getLatestShape();
          if (currentShape) {
            currentShape.fontSize = val;
            updateAndNotify();
          }
        }
      });
    }

    const strokeWidthInput = groupEl.querySelector('.shape-strokewidth-input') as HTMLInputElement;
    if (strokeWidthInput) {
      strokeWidthInput.addEventListener('change', () => {
        const val = parseFloat(strokeWidthInput.value);
        if (!isNaN(val) && val > 0) {
          const currentShape = getLatestShape();
          if (currentShape) {
            currentShape.strokeWidth = val;
            updateAndNotify();
          }
        }
      });
    }
  }
};
