import { PropertyEditorContext } from './types';
import { explodeConstruct } from '@aeckit/core-solver';

export const ConstructReferenceEditor = {
  renderHTML: (shape: any, index: number) => {
    let parameterOverridesHtml = '';
    if (shape.parameterOverrides && Object.keys(shape.parameterOverrides).length > 0) {
      parameterOverridesHtml = Object.entries(shape.parameterOverrides).map(([key, val]) => `
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label" title="parameterOverrides.${key}">${key}</label>
          <input type="text" class="precise-input prop-input" data-shape-index="${index}" data-prop="parameterOverrides.${key}" value="${val}" />
        </div>
      `).join('');
    } else {
      parameterOverridesHtml = `<div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 8px;">No overrides defined.</div>`;
    }

    return `
      <div class="form-group" data-shape-index="${index}">
        <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 12px; font-weight: bold; text-transform: uppercase;">Construct Reference</div>
        
        <div class="control-label-row">
          <label class="control-label" title="constructId">Target ID</label>
          <div style="flex: 1; text-align: right; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; color: var(--vscode-textLink-foreground);">${shape.constructId}</div>
        </div>
        
        <div style="border-top: 1px solid var(--vscode-widget-border); margin: 12px 0;"></div>
        
        <div class="control-label-row">
          <label class="control-label" title="x">X Position</label>
          <input type="text" class="precise-input prop-input" data-shape-index="${index}" data-prop="x" value="${shape.x !== undefined ? shape.x : 0}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label" title="y">Y Position</label>
          <input type="text" class="precise-input prop-input" data-shape-index="${index}" data-prop="y" value="${shape.y !== undefined ? shape.y : 0}" />
        </div>
        <div class="control-label-row" style="margin-top: 8px;">
          <label class="control-label" title="rotation">Rotation (°)</label>
          <input type="text" class="precise-input prop-input" data-shape-index="${index}" data-prop="rotation" value="${shape.rotation !== undefined ? shape.rotation : 0}" />
        </div>
        
        <div style="border-top: 1px solid var(--vscode-widget-border); margin: 12px 0;"></div>
        
        <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; font-weight: bold; text-transform: uppercase;">Parameter Overrides</div>
        ${parameterOverridesHtml}
        
        <div style="margin-top: 16px; border-top: 1px solid var(--vscode-widget-border); padding-top: 16px;">
          <button id="btn-explode-construct" class="btn btn-secondary" style="width: 100%; justify-content: center; display: flex; align-items: center; padding: 4px 8px;">
            <svg style="width:12px;height:12px;margin-right:6px;" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7 1l-1 3H2v2h3l-2 4h2l2-3 2 3h2L9 6h3V4h-4L7 1zm2.5 12.5L8 15l-1.5-1.5L8 12l1.5 1.5z"/>
            </svg>
            Explode Construct
          </button>
        </div>
      </div>
    `;
  },
  bindListeners: (ctx: PropertyEditorContext) => {
    const inputs = ctx.container.querySelectorAll(`input.prop-input[data-shape-index="${ctx.shapeIndex}"]`);
    inputs.forEach(input => {
      input.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLInputElement;
        const propPath = target.getAttribute('data-prop');
        const shape = ctx.getLatestShape();
        if (!shape || !propPath) return;

        const val = target.value;
        const numVal = Number(val);
        const finalVal = (val.trim() !== '' && !isNaN(numVal)) ? numVal : val;

        if (propPath.startsWith('parameterOverrides.')) {
          const key = propPath.split('.')[1];
          if (!shape.parameterOverrides) shape.parameterOverrides = {};
          shape.parameterOverrides[key] = finalVal;
        } else {
          shape[propPath] = finalVal;
        }

        ctx.updateAndNotify();
      });
    });

    const btnExplode = ctx.container.querySelector('#btn-explode-construct');
    if (btnExplode) {
      btnExplode.addEventListener('click', () => {
        // Dispatch a custom event that the CanvasManager or VisualizerUI can catch to do the explode
        const event = new CustomEvent('explode-construct', { 
          detail: { shapeIndex: ctx.shapeIndex, componentId: ctx.getLatestShape()?.componentId }
        });
        window.dispatchEvent(event);
      });
    }
  }
};
