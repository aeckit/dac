import { PropertyEditorContext } from './types';
import { Viewport } from '@aeckit/core-solver';

export const ViewportEditor = {
  renderHTML(viewport: Viewport, index: number): string {
    const detailName = typeof viewport.detail === 'string' ? viewport.detail : (viewport.detail as any).name || 'Detail Object';
    
    return `
      <div class="form-group" data-vp-index="${index}">
        <div class="control-label-row">
          <label class="control-label">Source File</label>
          <input type="text" class="precise-input vp-detail-input" value="${detailName}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Scale</label>
          <select class="precise-input vp-scale-input" style="width: 120px;">
            <option value="1/2=1-0" ${(viewport.scale || '').includes('1/2') ? 'selected' : ''}>1/2" = 1'-0" (1:24)</option>
            <option value="1=1-0" ${(viewport.scale || '').includes('1=') || (viewport.scale || '').includes('1"') ? 'selected' : ''}>1" = 1'-0" (1:12)</option>
            <option value="3=1-0" ${(viewport.scale || '').includes('3=') || (viewport.scale || '').includes('3"') ? 'selected' : ''}>3" = 1'-0" (1:4)</option>
            <option value="1:1" ${(viewport.scale || '').includes('1:1') ? 'selected' : ''}>1:1 (Full Size)</option>
          </select>
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Origin X</label>
          <input type="number" class="precise-input vp-x-input" value="${viewport.x}" style="width: 80px;" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Origin Y</label>
          <input type="number" class="precise-input vp-y-input" value="${viewport.y}" style="width: 80px;" />
        </div>
      </div>
    `;
  },

  bindListeners(context: PropertyEditorContext): void {
    const { container, shapeIndex, getLatestShape, updateAndNotify } = context;
    const groupEl = container.querySelector(`[data-vp-index="${shapeIndex}"]`) as HTMLElement;
    if (!groupEl) return;

    const detailInput = groupEl.querySelector('.vp-detail-input') as HTMLInputElement;
    const scaleInput = groupEl.querySelector('.vp-scale-input') as HTMLInputElement;
    const xInput = groupEl.querySelector('.vp-x-input') as HTMLInputElement;
    const yInput = groupEl.querySelector('.vp-y-input') as HTMLInputElement;

    const updateProp = (prop: keyof Viewport, value: any) => {
      const vp = getLatestShape() as unknown as Viewport;
      if (vp) {
        (vp as any)[prop] = value;
        updateAndNotify();
      }
    };

    if (detailInput) {
      detailInput.addEventListener('change', () => updateProp('detail', detailInput.value));
    }
    if (scaleInput) {
      scaleInput.addEventListener('change', () => updateProp('scale', scaleInput.value));
    }
    if (xInput) {
      xInput.addEventListener('change', () => updateProp('x', parseFloat(xInput.value) || 0));
    }
    if (yInput) {
      yInput.addEventListener('change', () => updateProp('y', parseFloat(yInput.value) || 0));
    }
  }
};
