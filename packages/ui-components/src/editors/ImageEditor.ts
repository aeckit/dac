import { PropertyEditorContext, PropertyEditor } from './types';

export const ImageEditor: PropertyEditor = {
  renderHTML(shape: any, index: number): string {
    const isCrop = shape.imageMode === 'crop';
    
    return `
      <div class="form-group" data-shape-index="${index}">
        <div class="control-label-row">
          <label class="control-label">Mode</label>
          <select class="precise-input shape-mode-input">
            <option value="resize" ${!isCrop ? 'selected' : ''}>Resize</option>
            <option value="crop" ${isCrop ? 'selected' : ''}>Crop</option>
          </select>
        </div>
        
        <div style="border-top: 1px solid var(--vscode-widget-border); margin: 12px 0;"></div>

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
          <label class="control-label">Crop X Offset</label>
          <input type="text" class="precise-input shape-cropx-input" value="${shape.cropX !== undefined ? shape.cropX : '0'}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Crop Y Offset</label>
          <input type="text" class="precise-input shape-cropy-input" value="${shape.cropY !== undefined ? shape.cropY : '0'}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Internal Image Width</label>
          <input type="text" class="precise-input shape-imgwidth-input" value="${shape.imgWidth !== undefined ? shape.imgWidth : shape.width || ''}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Internal Image Height</label>
          <input type="text" class="precise-input shape-imgheight-input" value="${shape.imgHeight !== undefined ? shape.imgHeight : shape.height || ''}" />
        </div>
        
        <div style="border-top: 1px solid var(--vscode-widget-border); margin: 12px 0;"></div>
        
        <div class="control-label-row">
          <label class="control-label">Image Source</label>
          <input type="text" class="precise-input shape-href-input" value="${shape.href || ''}" placeholder="e.g. test-image.jpg" />
        </div>
        
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Lock Aspect Ratio</label>
          <input type="checkbox" class="shape-lock-ratio-input" ${shape.lockAspectRatio ? 'checked' : ''} style="margin: 0;" />
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
            let val: any = input.value;
            // numeric properties
            if (['x', 'y', 'width', 'height', 'cropX', 'cropY', 'imgWidth', 'imgHeight'].includes(propName)) {
              if (val !== '' && !isNaN(Number(val))) {
                val = Number(val);
              }
            }
            if (currentShape.lockAspectRatio) {
              if (propName === 'width' && currentShape.width && currentShape.height && val) {
                const ratio = currentShape.height / currentShape.width;
                currentShape.height = Number((val * ratio).toFixed(3));
                if (currentShape.imgWidth) currentShape.imgWidth = val;
                if (currentShape.imgHeight) currentShape.imgHeight = currentShape.height;
              } else if (propName === 'height' && currentShape.width && currentShape.height && val) {
                const ratio = currentShape.width / currentShape.height;
                currentShape.width = Number((val * ratio).toFixed(3));
                if (currentShape.imgHeight) currentShape.imgHeight = val;
                if (currentShape.imgWidth) currentShape.imgWidth = currentShape.width;
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

    const bindCheckbox = (selector: string, propName: string) => {
      const input = groupEl.querySelector(selector) as HTMLInputElement;
      if (input) {
        input.addEventListener('change', () => {
          const currentShape = getLatestShape();
          if (currentShape) {
            currentShape[propName] = input.checked;
            updateAndNotify();
          }
        });
      }
    };

    bindStringInput('.shape-mode-input', 'imageMode');
    bindStringInput('.shape-x-input', 'x');
    bindStringInput('.shape-y-input', 'y');
    bindStringInput('.shape-width-input', 'width');
    bindStringInput('.shape-height-input', 'height');
    bindStringInput('.shape-cropx-input', 'cropX');
    bindStringInput('.shape-cropy-input', 'cropY');
    bindStringInput('.shape-imgwidth-input', 'imgWidth');
    bindStringInput('.shape-imgheight-input', 'imgHeight');
    bindStringInput('.shape-href-input', 'href');
    bindCheckbox('.shape-lock-ratio-input', 'lockAspectRatio');
  }
};
