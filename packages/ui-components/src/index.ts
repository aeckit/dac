import { DetailDocument, DrawingSetDocument, SheetDocument, renderDetail, renderSheet } from '@aeckit/core-solver';

export type VisualizerDocument = DetailDocument | DrawingSetDocument;

export class VisualizerUI {
  private container: HTMLElement;
  private doc: VisualizerDocument;
  private viewportsMap: Map<string, DetailDocument>;
  private titleBlockMap: Map<string, DetailDocument>;
  private onChange: (doc: VisualizerDocument) => void;

  // Drawing Set state
  private activeSheetIndex = 0;
  private sandboxWidth = 24;
  private sandboxHeight = 18;

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
  private sheetDropdownContainer!: HTMLElement;

  constructor(
    container: HTMLElement,
    initialDoc: VisualizerDocument,
    onChange: (doc: VisualizerDocument) => void,
    viewportsMap?: Map<string, DetailDocument>,
    titleBlockMap?: Map<string, DetailDocument>
  ) {
    this.container = container;
    this.doc = JSON.parse(JSON.stringify(initialDoc));
    this.viewportsMap = viewportsMap || new Map();
    this.titleBlockMap = titleBlockMap || new Map();
    this.onChange = onChange;

    this.initLayout();
    this.render();
    this.setupInteractivity();
  }

  private isDrawingSet(): boolean {
    return this.doc.type === 'CAD::DrawingSet';
  }

  private initLayout() {
    this.container.className = 'visualizer-container';

    // Scale settings are only relevant if it's a DetailDocument (since sheets are always 1:1 paper)
    const globalSettingsHtml = this.isDrawingSet() ? '' : `
      <div class="card" id="global-settings-card">
        <h3>Global Settings</h3>
        <div class="form-group row-align">
          <label for="scale-select" class="control-label">Drawing Scale</label>
          <select id="scale-select" class="precise-input" style="width: 120px;">
            <option value="1/2\\"=1'-0\\"" ${((this.doc as DetailDocument).scale || '').includes('1/2') ? 'selected' : ''}>1/2" = 1'-0" (1:24)</option>
            <option value="1\\"=1'-0\\"" ${((this.doc as DetailDocument).scale || '').includes('1"') ? 'selected' : ''}>1" = 1'-0" (1:12)</option>
            <option value="3\\"=1'-0\\"" ${((this.doc as DetailDocument).scale || '').includes('3"') ? 'selected' : ''}>3" = 1'-0" (1:4)</option>
            <option value="1:1" ${((this.doc as DetailDocument).scale || '').includes('1:1') ? 'selected' : ''}>1:1 (Full Size)</option>
          </select>
        </div>
      </div>
    `;

    this.container.innerHTML = `
      <div class="panel left-panel" id="left-sidebar">
        <div class="control-header">
          <h2>Drawing Inspector</h2>
          <div class="status-pill"><span class="status-indicator"></span>DAC Connected</div>
        </div>
        
        <div id="sheet-dropdown-container"></div>
        
        ${globalSettingsHtml}

        <!-- Component-specific dynamic properties form -->
        <div id="properties-card-container"></div>
      </div>
      
      <div class="panel right-panel" id="right-canvas">
        <div class="canvas-header">
          <span class="canvas-title">Interactive SVG canvas (Drag to Pan, Scroll to Zoom)</span>
          <button class="reset-btn" id="reset-view-btn">Reset View</button>
        </div>
        <div class="svg-viewport" id="svg-viewport-container" style="cursor: grab; overflow: hidden; background: #000;">
          <div id="svg-viewport-wrapper" style="transform-origin: 0 0; transition: transform 0.05s ease-out; min-width: 100%; min-height: 100%;"></div>
        </div>
      </div>
    `;

    this.leftPanel = this.container.querySelector('#left-sidebar') as HTMLElement;
    this.rightPanel = this.container.querySelector('#right-canvas') as HTMLElement;
    this.propertiesCardContainer = this.container.querySelector('#properties-card-container') as HTMLElement;
    this.sheetDropdownContainer = this.container.querySelector('#sheet-dropdown-container') as HTMLElement;
    this.svgViewport = this.container.querySelector('#svg-viewport-container') as HTMLElement;
    this.svgWrapper = this.container.querySelector('#svg-viewport-wrapper') as HTMLElement;

    if (!this.isDrawingSet()) {
      const scaleSelect = this.leftPanel.querySelector('#scale-select') as HTMLSelectElement;
      if (scaleSelect) {
        scaleSelect.addEventListener('change', () => {
          this.lastUpdateTime = Date.now();
          (this.doc as DetailDocument).scale = scaleSelect.value;
          this.updateAndNotify();
        });
      }
    }

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.target === this.svgViewport) {
          const widthInches = entry.contentRect.width / 96;
          const heightInches = entry.contentRect.height / 96;
          if (Math.abs(widthInches - this.sandboxWidth) > 0.1 || Math.abs(heightInches - this.sandboxHeight) > 0.1) {
            this.sandboxWidth = widthInches;
            this.sandboxHeight = heightInches;
            if (!this.isDrawingSet()) {
              this.renderSVG();
            }
          }
        }
      }
    });
    resizeObserver.observe(this.svgViewport);

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

  private renderSheetDropdown() {
    if (!this.isDrawingSet()) {
      this.sheetDropdownContainer.innerHTML = '';
      return;
    }

    const ds = this.doc as DrawingSetDocument;

    let optionsHtml = '';
    ds.sheets.forEach((sheetObj, index) => {
      const s = sheetObj as SheetDocument;
      optionsHtml += `<option value="${index}" ${index === this.activeSheetIndex ? 'selected' : ''}>${s.sheetNumber} - ${s.sheetName}</option>`;
    });

    this.sheetDropdownContainer.innerHTML = `
      <div class="card" style="margin-bottom: 12px; background: #1e293b;">
        <div style="font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Active Sheet</div>
        <select id="sheet-select" class="precise-input" style="width: 100%; font-size: 13px;">
          ${optionsHtml}
        </select>
      </div>
    `;

    const selectEl = this.sheetDropdownContainer.querySelector('#sheet-select') as HTMLSelectElement;
    selectEl.addEventListener('change', () => {
      this.activeSheetIndex = parseInt(selectEl.value, 10);
      this.selectedComponentId = null; // Clear selection when switching sheets
      this.render();
    });
  }

  private setupInteractivity() {
    this.svgViewport.addEventListener('click', (e) => {
      const target = e.target as SVGElement;
      if (this.isDragging) return;

      const interactiveGroup = target.closest('.interactive-component') as SVGGElement | null;

      if (interactiveGroup) {
        e.stopPropagation();
        const cid = interactiveGroup.getAttribute('data-component-id');
        const ctype = interactiveGroup.getAttribute('data-component-type');
        this.selectedComponentId = cid;
        this.selectedComponentType = ctype;
        this.render();
      } else {
        this.selectedComponentId = null;
        this.selectedComponentType = null;
        this.render();
      }
    });

    this.svgViewport.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
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
        setTimeout(() => { this.isDragging = false; }, 50);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    this.svgViewport.addEventListener('wheel', (e) => {
      e.preventDefault();

      const rect = this.svgViewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - this.panX) / this.zoom;
      const worldY = (mouseY - this.panY) / this.zoom;

      const zoomSpeed = 0.0012;
      const factor = 1 - e.deltaY * zoomSpeed;
      this.zoom = Math.max(0.05, Math.min(10.0, this.zoom * factor)); // Allow much wider zoom out for D-size sheets

      this.panX = mouseX - worldX * this.zoom;
      this.panY = mouseY - worldY * this.zoom;
      this.updateZoomPan();
    });
  }

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

    // We must find which detail document the component belongs to.
    let targetDoc: DetailDocument | null = null;
    let ds: DrawingSetDocument | null = null;

    if (this.isDrawingSet()) {
      ds = this.doc as DrawingSetDocument;
      // Search all viewports and titleblock for the parameter
      const sheet = ds.sheets[this.activeSheetIndex] as SheetDocument;

      // Try Title Block
      if (sheet.titleBlock && typeof sheet.titleBlock === 'string') {
        const tbDoc = this.titleBlockMap.get(sheet.titleBlock);
        if (tbDoc && tbDoc.parameters) {
          for (const param of Object.values(tbDoc.parameters)) {
            if (param.componentId === this.selectedComponentId) targetDoc = tbDoc;
          }
        }
      }

      // Try Viewports
      if (!targetDoc) {
        for (const vp of sheet.viewports) {
          const vDoc = typeof vp.detail === 'string' ? this.viewportsMap.get(vp.detail) : vp.detail;
          if (vDoc && vDoc.parameters) {
            for (const param of Object.values(vDoc.parameters)) {
              if (param.componentId === this.selectedComponentId) targetDoc = vDoc;
            }
          }
        }
      }
    } else {
      targetDoc = this.doc as DetailDocument;
    }

    if (!targetDoc || !targetDoc.parameters) {
      this.propertiesCardContainer.innerHTML = `
        <div class="card">
          <div class="card-body" style="color: var(--vscode-descriptionForeground); text-align: center;">
            This component contains no editable parameters.
          </div>
        </div>
      `;
      return;
    }

    // Filter parameters belonging to the selected componentId
    const componentParams: [string, any][] = [];
    for (const [key, param] of Object.entries(targetDoc.parameters)) {
      if (param.componentId === this.selectedComponentId) {
        componentParams.push([key, param]);
      }
    }

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

    // Hook listeners
    componentParams.forEach(([key, param]) => {
      const groupEl = this.propertiesCardContainer.querySelector(`[data-param-key="${key}"]`) as HTMLElement;
      if (!groupEl) return;

      if (param.type === 'Number') {
        const slider = groupEl.querySelector('.param-slider') as HTMLInputElement;
        const numInput = groupEl.querySelector('.param-num-input') as HTMLInputElement;

        const updateVal = (val: number) => {
          this.lastUpdateTime = Date.now();
          targetDoc!.parameters![key].value = val;
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
          targetDoc!.parameters![key].value = toggle.checked;
          this.updateAndNotify();
        });
      }
    });
  }

  private renderSVG() {
    try {
      let svg = '';
      if (this.isDrawingSet()) {
        const ds = this.doc as DrawingSetDocument;
        const sheet = ds.sheets[this.activeSheetIndex] as SheetDocument;
        let titleBlockDoc: DetailDocument | undefined = undefined;
        if (sheet.titleBlock && typeof sheet.titleBlock === 'string') {
          titleBlockDoc = this.titleBlockMap.get(sheet.titleBlock);
        }
        svg = renderSheet(sheet, ds.titleBlockData || {}, this.viewportsMap, titleBlockDoc);
      } else {
        svg = renderDetail(this.doc as DetailDocument, this.sandboxWidth, this.sandboxHeight);
      }

      this.svgWrapper.innerHTML = svg;

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

  private updateAndNotify() {
    this.renderSVG();
    this.onChange(this.doc);
    // We send back this.doc. Note: When it's a DrawingSet, saving it back directly via vsix will just save the DrawingSet.
    // If a viewport parameter was changed, we'd theoretically want to save the viewport file, but for this prototype, we'll
    // rely on the Webview extension host logic to handle it if we want bidirectional saves on DrawingSets.
  }

  public updateConfig(newDoc: VisualizerDocument, viewportsMap?: Map<string, DetailDocument>, titleBlockMap?: Map<string, DetailDocument>) {
    this.doc = JSON.parse(JSON.stringify(newDoc));
    if (viewportsMap) this.viewportsMap = viewportsMap;
    if (titleBlockMap) this.titleBlockMap = titleBlockMap;

    // Maintain selection state
    this.renderSVG();
    if (Date.now() - this.lastUpdateTime > 500) {
      this.renderPropertyEditor(); // Re-render props since we don't have updatePropertyValues hooked up fully for DrawingSets yet
    }
  }

  public render() {
    this.renderSheetDropdown();
    this.renderSVG();
    this.renderPropertyEditor();
    this.updateZoomPan();
  }
}
