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
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Width</label>
          <input type="number" class="precise-input vp-w-input" value="${viewport.width !== undefined ? viewport.width : ''}" style="width: 80px;" placeholder="Auto" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Height</label>
          <input type="number" class="precise-input vp-h-input" value="${viewport.height !== undefined ? viewport.height : ''}" style="width: 80px;" placeholder="Auto" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Title</label>
          <input type="text" class="precise-input vp-title-input" value="${viewport.title || ''}" style="width: 120px;" placeholder="Auto" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Detail #</label>
          <input type="text" class="precise-input vp-detail-num-input" value="${viewport.detailNumber || ''}" style="width: 80px;" placeholder="1" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Title Note</label>
          <input type="text" class="precise-input vp-title-note-input" value="${viewport.titleNote || ''}" style="width: 120px;" placeholder="Optional" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Title Pos</label>
          <select class="precise-input vp-title-pos-input" style="width: 80px;">
            <option value="bottom" ${(viewport.titlePosition !== 'top') ? 'selected' : ''}>Bottom</option>
            <option value="top" ${(viewport.titlePosition === 'top') ? 'selected' : ''}>Top</option>
          </select>
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label">Offset Y</label>
          <input type="number" step="0.1" class="precise-input vp-title-offset-input" value="${viewport.titleOffsetY || 0}" style="width: 80px;" />
        </div>
        
        <div class="control-label-row" style="margin-top: 8px; justify-content: flex-start;">
          <input type="checkbox" class="vp-hide-detail-num-input" ${viewport.hideDetailNumber ? 'checked' : ''} id="hideDetailNum-${index}" />
          <label class="control-label" for="hideDetailNum-${index}" style="margin-left: 6px;">Hide Detail #</label>
        </div>
        <div class="control-label-row" style="margin-top: 4px; justify-content: flex-start;">
          <input type="checkbox" class="vp-hide-title-input" ${viewport.hideTitle ? 'checked' : ''} id="hideTitle-${index}" />
          <label class="control-label" for="hideTitle-${index}" style="margin-left: 6px;">Hide Title</label>
        </div>
        <div class="control-label-row" style="margin-top: 4px; justify-content: flex-start;">
          <input type="checkbox" class="vp-hide-scale-input" ${viewport.hideScale ? 'checked' : ''} id="hideScale-${index}" />
          <label class="control-label" for="hideScale-${index}" style="margin-left: 6px;">Hide Scale</label>
        </div>
      </div>
    `;
  },

  bindListeners(context: PropertyEditorContext): void {
    const { container, shapeIndex, getLatestShape, updateAndNotify } = context;
    const groupEl = container.querySelector(`[data-vp-index="${shapeIndex}"]`) as HTMLElement;
    if (!groupEl) return;

    const detailInput = groupEl.querySelector('.vp-detail-input') as HTMLInputElement;
    const scaleInput = groupEl.querySelector('.vp-scale-input') as HTMLSelectElement;
    const xInput = groupEl.querySelector('.vp-x-input') as HTMLInputElement;
    const yInput = groupEl.querySelector('.vp-y-input') as HTMLInputElement;
    const wInput = groupEl.querySelector('.vp-w-input') as HTMLInputElement;
    const hInput = groupEl.querySelector('.vp-h-input') as HTMLInputElement;
    const titleInput = groupEl.querySelector('.vp-title-input') as HTMLInputElement;
    const detailNumInput = groupEl.querySelector('.vp-detail-num-input') as HTMLInputElement;
    const titleNoteInput = groupEl.querySelector('.vp-title-note-input') as HTMLInputElement;
    const titlePosInput = groupEl.querySelector('.vp-title-pos-input') as HTMLSelectElement;
    const titleOffsetInput = groupEl.querySelector('.vp-title-offset-input') as HTMLInputElement;
    const hideTitleInput = groupEl.querySelector('.vp-hide-title-input') as HTMLInputElement;
    const hideScaleInput = groupEl.querySelector('.vp-hide-scale-input') as HTMLInputElement;
    const hideDetailNumInput = groupEl.querySelector('.vp-hide-detail-num-input') as HTMLInputElement;

    const updateProp = (prop: keyof Viewport, value: any) => {
      const vp = getLatestShape() as unknown as Viewport;
      if (vp) {
        if (value === '' || Number.isNaN(value) || value === null) {
          delete (vp as any)[prop];
        } else {
          (vp as any)[prop] = value;
        }
        updateAndNotify();
      }
    };

    if (detailInput) detailInput.addEventListener('change', () => updateProp('detail', detailInput.value));
    if (scaleInput) scaleInput.addEventListener('change', () => updateProp('scale', scaleInput.value));
    if (xInput) xInput.addEventListener('change', () => updateProp('x', Math.round((parseFloat(xInput.value) || 0) * 1000) / 1000));
    if (yInput) yInput.addEventListener('change', () => updateProp('y', Math.round((parseFloat(yInput.value) || 0) * 1000) / 1000));
    
    if (wInput) wInput.addEventListener('change', () => updateProp('width', wInput.value ? Math.round(parseFloat(wInput.value) * 1000) / 1000 : null));
    if (hInput) hInput.addEventListener('change', () => updateProp('height', hInput.value ? Math.round(parseFloat(hInput.value) * 1000) / 1000 : null));
    if (titleInput) titleInput.addEventListener('change', () => updateProp('title', titleInput.value));
    if (detailNumInput) detailNumInput.addEventListener('change', () => updateProp('detailNumber', detailNumInput.value));
    if (titleNoteInput) titleNoteInput.addEventListener('change', () => updateProp('titleNote', titleNoteInput.value));
    if (titlePosInput) titlePosInput.addEventListener('change', () => updateProp('titlePosition', titlePosInput.value));
    if (titleOffsetInput) titleOffsetInput.addEventListener('change', () => updateProp('titleOffsetY', titleOffsetInput.value ? Math.round(parseFloat(titleOffsetInput.value) * 1000) / 1000 : null));
    
    if (hideTitleInput) hideTitleInput.addEventListener('change', () => updateProp('hideTitle', hideTitleInput.checked));
    if (hideScaleInput) hideScaleInput.addEventListener('change', () => updateProp('hideScale', hideScaleInput.checked));
    if (hideDetailNumInput) hideDetailNumInput.addEventListener('change', () => updateProp('hideDetailNumber', hideDetailNumInput.checked));
  }
};
