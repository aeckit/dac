import { ParametricEditorContext } from './types';

export const ParametricEditor = {
  renderHTML(componentParams: [string, any][]): string {
    return componentParams.map(([key, param]) => {
      const resolvedVal = param.value !== undefined ? param.value : param.default;

      if (param.options && Array.isArray(param.options)) {
        const selectOptions = param.options.map((opt: any) => 
          `<option value="${opt.value}" ${opt.value === resolvedVal ? 'selected' : ''}>${opt.label}</option>`
        ).join('');

        return `
          <div class="form-group" data-param-key="${key}">
            <label class="control-label">${param.label || key}</label>
            <select class="param-select prop-input" style="width:100%; padding: 4px; background: #1e293b; color: #f1f5f9; border: 1px solid #334155; border-radius: 4px; margin-top: 4px; font-size: 11px;">
              ${selectOptions}
            </select>
          </div>
        `;
      } else if (param.type === 'Number') {
        const minVal = param.min !== undefined ? param.min : -100;
        const maxVal = param.max !== undefined ? param.max : 100;

        return `
          <div class="form-group" data-param-key="${key}">
            <div class="control-label-row">
              <label class="control-label">${param.label || key}</label>
              <input type="number" class="precise-input param-num-input" min="${minVal}" max="${maxVal}" step="0.1" value="${resolvedVal}" />
            </div>
            <div class="slider-container">
              <span class="limit">${minVal}</span>
              <input type="range" class="slider-range param-slider" min="${minVal}" max="${maxVal}" step="0.1" value="${resolvedVal}" />
              <span class="limit">${maxVal}</span>
            </div>
          </div>
        `;
      } else {
        const isChecked = resolvedVal === true ? 'checked' : '';
        return `
          <div class="form-group row-align" data-param-key="${key}">
            <label class="control-label">${param.label || key}</label>
            <label class="switch">
              <input type="checkbox" class="param-toggle" ${isChecked} />
              <span class="slider-round"></span>
            </label>
          </div>
        `;
      }
    }).join('');
  },

  bindListeners(context: ParametricEditorContext): void {
    const { container, componentParams, getLatestDoc, updateAndNotify } = context;

    componentParams.forEach(([key, param]) => {
      const groupEl = container.querySelector(`[data-param-key="${key}"]`) as HTMLElement;
      if (!groupEl) return;

      if (param.options && Array.isArray(param.options)) {
        const select = groupEl.querySelector('.param-select') as HTMLSelectElement;
        if (select) {
          select.addEventListener('change', () => {
            const val = select.value;
            const originalOpt = param.options!.find((o: any) => String(o.value) === val);
            const finalVal = originalOpt ? originalOpt.value : val;

            const latestDoc = getLatestDoc();
            if (latestDoc && latestDoc.parameters && latestDoc.parameters[key]) {
              latestDoc.parameters[key].value = finalVal;
              updateAndNotify();
            }
          });
        }
      } else if (param.type === 'Number') {
        const slider = groupEl.querySelector('.param-slider') as HTMLInputElement;
        const numInput = groupEl.querySelector('.param-num-input') as HTMLInputElement;

        const updateVal = (val: number) => {
          const latestDoc = getLatestDoc();
          if (latestDoc && latestDoc.parameters && latestDoc.parameters[key]) {
            latestDoc.parameters[key].value = val;
            updateAndNotify();
          }
        };

        slider.addEventListener('input', () => {
          const val = parseFloat(slider.value);
          numInput.value = String(val);
          updateVal(val);
        });

        numInput.addEventListener('change', () => {
          let val = parseFloat(numInput.value);
          if (isNaN(val)) return;
          const min = param.min !== undefined ? param.min : -100;
          const max = param.max !== undefined ? param.max : 100;
          if (val < min) val = min;
          if (val > max) val = max;
          slider.value = String(val);
          updateVal(val);
        });
      } else {
        const toggle = groupEl.querySelector('.param-toggle') as HTMLInputElement;
        toggle.addEventListener('change', () => {
          const latestDoc = getLatestDoc();
          if (latestDoc && latestDoc.parameters && latestDoc.parameters[key]) {
            latestDoc.parameters[key].value = toggle.checked;
            updateAndNotify();
          }
        });
      }
    });
  }
};
