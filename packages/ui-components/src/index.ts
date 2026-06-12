import { DetailDocument, renderDetail } from '@aeckit/core-solver';

export class VisualizerUI {
  private container: HTMLElement;
  private doc: DetailDocument;
  private onChange: (doc: DetailDocument) => void;

  // Selection state
  private selectedComponentId: string | null = null;
  private selectedComponentType: string | null = null;

  // Zoom & Pan state
  private zoom = 1.0;
  private panX = 0;
  private panY = 0;
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private lastUpdateTime = 0;

  // DOM references
  private leftPanel!: HTMLElement;
  private rightPanel!: HTMLElement;
  private svgViewport!: HTMLElement;
  private svgWrapper!: HTMLElement;
  private propertiesCardContainer!: HTMLElement;

  constructor(
    container: HTMLElement,
    initialDoc: DetailDocument,
    onChange: (doc: DetailDocument) => void
  ) {
    this.container = container;
    this.doc = { ...initialDoc };
    this.onChange = onChange;

    this.initLayout();
    this.render();
    this.setupInteractivity();
  }

  /**
   * Initializes split-panel HTML viewports
   */
  private initLayout() {
    this.container.className = 'visualizer-container';
    this.container.innerHTML = `
      <div class="panel left-panel" id="left-sidebar">
        <div class="control-header">
          <h2>Drawing Inspector</h2>
          <div class="status-pill"><span class="status-indicator"></span>DAC Connected</div>
        </div>
        
        <!-- Global Settings (Scale) -->
        <div class="card" id="global-settings-card">
          <h3>Global Settings</h3>
          <div class="form-group row-align">
            <label for="scale-select" class="control-label">Drawing Scale</label>
            <select id="scale-select" class="precise-input" style="width: 120px;">
              <option value="1/2\\"=1'-0\\"" ${this.doc.scale.includes('1/2') ? 'selected' : ''}>1/2" = 1'-0" (1:24)</option>
              <option value="1\\"=1'-0\\"" ${this.doc.scale.includes('1"') ? 'selected' : ''}>1" = 1'-0" (1:12)</option>
              <option value="3\\"=1'-0\\"" ${this.doc.scale.includes('3"') ? 'selected' : ''}>3" = 1'-0" (1:4)</option>
              <option value="1:1" ${this.doc.scale.includes('1:1') ? 'selected' : ''}>1:1 (Full Size)</option>
            </select>
          </div>
        </div>

        <!-- Component-specific dynamic properties form -->
        <div id="properties-card-container"></div>
      </div>
      
      <div class="panel right-panel" id="right-canvas">
        <div class="canvas-header">
          <span class="canvas-title">Interactive SVG canvas (Drag to Pan, Scroll to Zoom)</span>
          <button class="reset-btn" id="reset-view-btn">Reset View</button>
        </div>
        <div class="svg-viewport" id="svg-viewport-container" style="cursor: grab;">
          <div id="svg-viewport-wrapper" style="transform-origin: 0 0; transition: transform 0.05s ease-out;"></div>
        </div>
      </div>
    `;

    this.leftPanel = this.container.querySelector('#left-sidebar') as HTMLElement;
    this.rightPanel = this.container.querySelector('#right-canvas') as HTMLElement;
    this.propertiesCardContainer = this.container.querySelector('#properties-card-container') as HTMLElement;
    this.svgViewport = this.container.querySelector('#svg-viewport-container') as HTMLElement;
    this.svgWrapper = this.container.querySelector('#svg-viewport-wrapper') as HTMLElement;

    // Attach scale handler
    const scaleSelect = this.leftPanel.querySelector('#scale-select') as HTMLSelectElement;
    scaleSelect.addEventListener('change', () => {
      this.lastUpdateTime = Date.now();
      this.doc.scale = scaleSelect.value;
      this.updateAndNotify();
    });

    // Reset View Zoom/Pan
    const resetBtn = this.rightPanel.querySelector('#reset-view-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      this.zoom = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.selectedComponentId = null;
      this.selectedComponentType = null;
      this.updateZoomPan();
      this.render();
    });
  }

  /**
   * Attaches SVG interaction click and Zoom & Pan drag listeners
   */
  private setupInteractivity() {
    // 1. CLICK SELECTION ON CANVAS
    this.svgViewport.addEventListener('click', (e) => {
      const target = e.target as SVGElement;
      
      // Stop drag releases from triggering clicks
      if (this.isDragging) return;

      const interactiveGroup = target.closest('.interactive-component') as SVGGElement | null;
      
      if (interactiveGroup) {
        // Stop click event propagation to background
        e.stopPropagation();

        const cid = interactiveGroup.getAttribute('data-component-id');
        const ctype = interactiveGroup.getAttribute('data-component-type');
        
        this.selectedComponentId = cid;
        this.selectedComponentType = ctype;
        this.render();
      } else {
        // Clicking on blank background clears selection
        this.selectedComponentId = null;
        this.selectedComponentType = null;
        this.render();
      }
    });

    // 2. MOUSE DRAG TO PAN
    this.svgViewport.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Left click only
      this.isDragging = false;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
      
      const onMouseMove = (moveEvt: MouseEvent) => {
        this.isDragging = true;
        this.panX = moveEvt.clientX - this.startX;
        this.panY = moveEvt.clientY - this.startY;
        this.svgViewport.style.cursor = 'grabbing';
        this.updateZoomPan();
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        this.svgViewport.style.cursor = 'grab';
        // Timeout to prevent click fires immediately on drag release
        setTimeout(() => { this.isDragging = false; }, 50);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // 3. MOUSE WHEEL TO ZOOM (SMOOTH & DETAILED ZOOM BASED ON ACTUAL DELTA)
    this.svgViewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const rect = this.svgViewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Coordinate before scaling
      const worldX = (mouseX - this.panX) / this.zoom;
      const worldY = (mouseY - this.panY) / this.zoom;

      // Calculate Zoom factor proportional to deltaY for smooth trackpads
      const zoomSpeed = 0.0012;
      const factor = 1 - e.deltaY * zoomSpeed;
      this.zoom = Math.max(0.4, Math.min(10.0, this.zoom * factor));

      // Re-adjust panning offsets to zoom centered on mouse cursor
      this.panX = mouseX - worldX * this.zoom;
      this.panY = mouseY - worldY * this.zoom;
      this.updateZoomPan();
    });
  }

  /**
   * Applies the Zoom/Pan CSS transforms on the viewport wrapper
   */
  private updateZoomPan() {
    this.svgWrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  /**
   * Generates dynamic form sliders for parameter variables associated with the selection
   */
  private renderPropertyEditor() {
    if (!this.selectedComponentId) {
      this.propertiesCardContainer.innerHTML = `
        <div class="card" style="border-style: dashed; border-color: var(--vscode-widget-border);">
          <div class="card-body" style="text-align: center; color: var(--vscode-descriptionForeground); padding: 30px 10px;">
            <p style="margin: 0 0 10px 0; font-size: 18px;">🔍</p>
            <p style="margin: 0;">Click an element in the blueprint canvas to inspect and edit properties.</p>
          </div>
        </div>
      `;
      return;
    }

    // Filter parameters belonging to the selected componentId
    const componentParams: [string, any][] = [];
    for (const [key, param] of Object.entries(this.doc.parameters)) {
      if (param.componentId === this.selectedComponentId) {
        componentParams.push([key, param]);
      }
    }

    // Pretty component label
    const niceName = this.selectedComponentType?.split('::').pop() || 'Selected Component';

    if (componentParams.length === 0) {
      this.propertiesCardContainer.innerHTML = `
        <div class="card">
          <h3>${niceName}</h3>
          <div class="card-body" style="color: var(--vscode-descriptionForeground); text-align: center; padding: 16px;">
            This component contains no editable parameters.
          </div>
        </div>
      `;
      return;
    }

    // Generate property control HTML strings
    const controlsHtml = componentParams.map(([key, param]) => {
      const resolvedVal = param.value !== undefined ? param.value : param.default;
      
      if (param.type === 'Number') {
        const minVal = param.min !== undefined ? param.min : -100;
        const maxVal = param.max !== undefined ? param.max : 100;
        
        return `
          <div class="form-group" data-param-key="${key}">
            <div class="control-label-row">
              <label class="control-label">${param.label}</label>
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
        // Boolean Checkbox switch
        const isChecked = resolvedVal === true ? 'checked' : '';
        return `
          <div class="form-group row-align" data-param-key="${key}">
            <label class="control-label">${param.label}</label>
            <label class="switch">
              <input type="checkbox" class="param-toggle" ${isChecked} />
              <span class="slider-round"></span>
            </label>
          </div>
        `;
      }
    }).join('\n');

    this.propertiesCardContainer.innerHTML = `
      <div class="card">
        <h3>${niceName}</h3>
        <div class="properties-editor-body">
          ${controlsHtml}
        </div>
      </div>
    `;

    // Hook listeners inside properties
    componentParams.forEach(([key, param]) => {
      const groupEl = this.propertiesCardContainer.querySelector(`[data-param-key="${key}"]`) as HTMLElement;
      if (!groupEl) return;

      if (param.type === 'Number') {
        const slider = groupEl.querySelector('.param-slider') as HTMLInputElement;
        const numInput = groupEl.querySelector('.param-num-input') as HTMLInputElement;

        const updateVal = (val: number) => {
          this.lastUpdateTime = Date.now();
          this.doc.parameters[key].value = val;
          this.updateAndNotify();
        };

        slider.addEventListener('input', () => {
          const val = parseFloat(slider.value);
          numInput.value = String(val);
          updateVal(val);
        });

        numInput.addEventListener('input', () => {
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
          this.lastUpdateTime = Date.now();
          this.doc.parameters[key].value = toggle.checked;
          this.updateAndNotify();
        });
      }
    });
  }

  /**
   * Refreshes SVG drawing output
   */
  private renderSVG() {
    try {
      const svg = renderDetail(this.doc);
      this.svgWrapper.innerHTML = svg;

      // If there is an active selection, inject selection glow style class directly
      if (this.selectedComponentId) {
        const selectedGroup = this.svgWrapper.querySelector(`[data-component-id="${this.selectedComponentId}"]`) as SVGElement | null;
        if (selectedGroup) {
          selectedGroup.classList.add('selected-highlight');
        }
      }
    } catch (err) {
      this.svgWrapper.innerHTML = `
        <div class="render-error">
          <p>Render Compile Error:</p>
          <pre>${err instanceof Error ? err.message : String(err)}</pre>
        </div>
      `;
    }
  }

  /**
   * Updates visual rendering and fires changes back to VS Code Extension
   */
  private updateAndNotify() {
    this.renderSVG();
    this.onChange({ ...this.doc });
  }

  /**
   * Updates form values in-place without destroying DOM elements to preserve user focus
   */
  private updatePropertyValues() {
    // 1. Sync global scale select if not focused
    const scaleSelect = this.leftPanel.querySelector('#scale-select') as HTMLSelectElement;
    if (scaleSelect && document.activeElement !== scaleSelect) {
      scaleSelect.value = this.doc.scale;
    }

    if (!this.selectedComponentId) return;
    
    // 2. Sync component parameters
    for (const [key, param] of Object.entries(this.doc.parameters)) {
      if (param.componentId !== this.selectedComponentId) continue;
      
      const groupEl = this.propertiesCardContainer.querySelector(`[data-param-key="${key}"]`) as HTMLElement;
      if (!groupEl) continue;

      const resolvedVal = param.value !== undefined ? param.value : param.default;

      if (param.type === 'Number') {
        const slider = groupEl.querySelector('.param-slider') as HTMLInputElement;
        const numInput = groupEl.querySelector('.param-num-input') as HTMLInputElement;
        
        if (slider && document.activeElement !== slider) {
          slider.value = String(resolvedVal);
        }
        if (numInput && document.activeElement !== numInput) {
          numInput.value = String(resolvedVal);
        }
      } else {
        const toggle = groupEl.querySelector('.param-toggle') as HTMLInputElement;
        if (toggle && document.activeElement !== toggle) {
          toggle.checked = resolvedVal === true;
        }
      }
    }
  }

  /**
   * Receives dynamic configurations from VS Code editor saves
   */
  public updateConfig(newDoc: DetailDocument) {
    this.doc = { ...newDoc };
    
    // Maintain selection state if the component still exists in the incoming document
    const exists = this.doc.geometry.some(g => g.componentId === this.selectedComponentId);
    if (!exists) {
      this.selectedComponentId = null;
      this.selectedComponentType = null;
      this.render(); // Complete redraw to reset to default selection helper card
    } else {
      // Re-render the SVG visuals
      this.renderSVG();
      // Sync form parameters in-place if not recently changed by user
      if (Date.now() - this.lastUpdateTime > 500) {
        this.updatePropertyValues();
      }
    }
  }

  /**
   * Complete redraw cycle (e.g. on new selection or view reset)
   */
  public render() {
    this.renderSVG();
    this.renderPropertyEditor();
    this.updateZoomPan();
  }
}
