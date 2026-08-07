import { ParametricEditorContext } from './types';

export const ParametricEditor = {
  renderHTML(componentParams: [string, any][]): string {
    return componentParams.map(([key, param]) => {
      const resolvedVal = param.value !== undefined ? param.value : param.default;

      if (param.type === 'Number') {
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

      if (param.type === 'Number') {
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
