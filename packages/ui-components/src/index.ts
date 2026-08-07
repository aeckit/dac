import { DetailDocument, DrawingSetDocument, SheetDocument, renderDetail, renderSheet } from '@aeckit/core-solver';
import { getEditorForShape, ParametricEditor, DocumentEditor, ViewportEditor } from './editors';
import { Viewport } from '@aeckit/core-solver';
import { ParametricEditorContext, PropertyEditorContext } from './editors/types';
export type VisualizerDocument = DetailDocument | DrawingSetDocument | SheetDocument;

export interface VisualizerUIOptions {
  showLeftToggle?: boolean;  // default: true
  showRightToggle?: boolean; // default: true
}

export class VisualizerUI {
  private container: HTMLElement;
  private doc: VisualizerDocument;
  private viewportsMap: Map<string, DetailDocument>;
  private titleBlockMap: Map<string, DetailDocument>;
  private onChange: (doc: VisualizerDocument, viewportsMap?: Map<string, DetailDocument>, titleBlockMap?: Map<string, DetailDocument>) => void;
  private options: VisualizerUIOptions;

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
    onChange: (doc: VisualizerDocument, viewportsMap?: Map<string, DetailDocument>, titleBlockMap?: Map<string, DetailDocument>) => void,
    viewportsMap?: Map<string, DetailDocument>,
    titleBlockMap?: Map<string, DetailDocument>,
    options?: VisualizerUIOptions
  ) {
    this.container = container;
    this.doc = JSON.parse(JSON.stringify(initialDoc));
    this.viewportsMap = viewportsMap || new Map();
    this.titleBlockMap = titleBlockMap || new Map();
    this.onChange = onChange;
    this.options = options || {};

    this.initLayout();
    this.render();
    this.setupInteractivity();
  }

  private isDrawingSet(): boolean {
    return this.doc.type === 'CAD::DrawingSet';
  }

  public getActiveSheet(): SheetDocument | null {
    if (this.doc.type === 'CAD::Sheet') {
      return this.doc as SheetDocument;
    }
    if (this.isDrawingSet()) {
      const ds = this.doc as DrawingSetDocument;
      return ds.sheets[this.activeSheetIndex] as SheetDocument;
    }
    return null;
  }

  public insertViewport(detailName: string) {
    const activeSheet = this.getActiveSheet();
    if (activeSheet) {
      if (!activeSheet.viewports) activeSheet.viewports = [];
      const id = 'viewport_' + Date.now().toString(36);
      activeSheet.viewports.push({ detail: detailName, x: 2, y: 2, scale: '1:1', componentId: id });
      this.updateAndNotify();
    }
  }

  private initLayout() {
    this.container.className = 'visualizer-container';

    // Scale settings are only relevant if it's a DetailDocument (since sheets are always 1:1 paper)
    const globalSettingsHtml = this.doc.type === 'CAD::Detail' ? `
      <div class="card" id="global-settings-card">
        <h3>Global Settings</h3>
        <div class="form-group row-align">
          <label for="scale-select" class="control-label">Drawing Scale</label>
          <select id="scale-select" class="precise-input" style="width: 120px;">
            <option value="1/2=1-0" ${((this.doc as DetailDocument).scale || '').includes('1/2') ? 'selected' : ''}>1/2" = 1'-0" (1:24)</option>
            <option value="1=1-0" ${((this.doc as DetailDocument).scale || '').includes('1=') || ((this.doc as DetailDocument).scale || '').includes('1"') ? 'selected' : ''}>1" = 1'-0" (1:12)</option>
            <option value="3=1-0" ${((this.doc as DetailDocument).scale || '').includes('3=') || ((this.doc as DetailDocument).scale || '').includes('3"') ? 'selected' : ''}>3" = 1'-0" (1:4)</option>
            <option value="1:1" ${((this.doc as DetailDocument).scale || '').includes('1:1') ? 'selected' : ''}>1:1 (Full Size)</option>
          </select>
        </div>
      </div>
    ` : '';

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
        <div class="canvas-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 8px;">
          <div style="display: flex; align-items: center;">
            <button class="reset-btn icon-btn" id="btn-toggle-left-pane" title="Toggle Left Sidebar">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><line x1="6" y1="3" x2="6" y2="13"/></svg>
            </button>
          </div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1;">
            <button class="reset-btn icon-btn" id="btn-add-rect" title="Add Rectangle">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/></svg>
            </button>
            <button class="reset-btn icon-btn" id="btn-add-line" title="Add Line">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="13" x2="13" y2="3"/><circle cx="3" cy="13" r="1.5" fill="currentColor"/><circle cx="13" cy="3" r="1.5" fill="currentColor"/></svg>
            </button>
            <button class="reset-btn icon-btn" id="btn-add-text" title="Add Text">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4V3h10v1M8 3v10M6 13h4"/></svg>
            </button>
            <button class="reset-btn icon-btn" id="btn-add-viewport" title="Add Viewport">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="10" height="10" rx="1"/><rect x="5" y="5" width="6" height="6" stroke-dasharray="1 1"/></svg>
            </button>
            <div id="canvas-header-divider" style="width: 1px; height: 16px; background: #334155; margin: 0 4px;"></div>
            <button class="reset-btn icon-btn" id="reset-view-btn" title="Reset View (Zoom Extents)">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 5V2h3M11 2h3v3M14 11v3h-3M5 14H2v-3"/><rect x="5" y="5" width="6" height="6" rx="0.5"/></svg>
            </button>
          </div>
          <div style="display: flex; align-items: center;">
            <button class="reset-btn icon-btn" id="btn-toggle-right-pane" title="Toggle Inspector/JSON">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="12" height="10" rx="1"/><line x1="10" y1="3" x2="10" y2="13"/></svg>
            </button>
          </div>
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

    if (this.doc.type === 'CAD::Detail') {
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
            if (this.doc.type === 'CAD::Detail') {
              this.renderSVG();
            }
          }
        }
      }
    });
    resizeObserver.observe(this.svgViewport);

    const resetBtn = this.rightPanel.querySelector('#reset-view-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      this.resetView();
    });

    const btnAddRect = this.rightPanel.querySelector('#btn-add-rect') as HTMLButtonElement;
    btnAddRect?.addEventListener('click', () => {
      if (this.doc.type === 'CAD::Detail') {
        const detailDoc = this.doc as DetailDocument;
        if (!detailDoc.geometry) detailDoc.geometry = [];
        const id = 'rect_' + Date.now().toString(36);
        const offset = detailDoc.geometry.length * 0.5;
        detailDoc.geometry.push({ type: 'CAD::Shape::Rectangle', componentId: id, componentType: 'Rectangle', x: offset, y: offset, width: 12, height: 12, fill: 'gray' });
        this.selectedComponentId = id;
        this.selectedComponentType = 'CAD::Shape::Rectangle';
        this.updateAndNotify();
      }
    });

    const btnAddLine = this.rightPanel.querySelector('#btn-add-line') as HTMLButtonElement;
    btnAddLine?.addEventListener('click', () => {
      if (this.doc.type === 'CAD::Detail') {
        const detailDoc = this.doc as DetailDocument;
        if (!detailDoc.geometry) detailDoc.geometry = [];
        const id = 'line_' + Date.now().toString(36);
        const offset = detailDoc.geometry.length * 0.5;
        detailDoc.geometry.push({ type: 'CAD::Shape::Line', componentId: id, componentType: 'Line', x1: offset, y1: offset, x2: 12 + offset, y2: 12 + offset, strokeWidth: 2 });
        this.selectedComponentId = id;
        this.selectedComponentType = 'CAD::Shape::Line';
        this.updateAndNotify();
      }
    });

    const btnAddText = this.rightPanel.querySelector('#btn-add-text') as HTMLButtonElement;
    btnAddText?.addEventListener('click', () => {
      if (this.doc.type === 'CAD::Detail') {
        const detailDoc = this.doc as DetailDocument;
        if (!detailDoc.geometry) detailDoc.geometry = [];
        const id = 'text_' + Date.now().toString(36);
        const offset = detailDoc.geometry.length * 0.5;
        detailDoc.geometry.push({ type: 'CAD::Annotation::Text', componentId: id, componentType: 'Text', x: offset, y: offset, text: 'New Text', fontSize: 4 });
        this.selectedComponentId = id;
        this.selectedComponentType = 'CAD::Annotation::Text';
        this.updateAndNotify();
      }
    });

    const btnAddViewport = this.rightPanel.querySelector('#btn-add-viewport') as HTMLButtonElement;
    btnAddViewport?.addEventListener('click', () => {
      const activeSheet = this.getActiveSheet();
      if (activeSheet) {
        if (!activeSheet.viewports) activeSheet.viewports = [];
        const id = 'viewport_' + Date.now().toString(36);
        const offset = 2 + (activeSheet.viewports.length * 2);
        activeSheet.viewports.push({ detail: '', x: offset, y: offset, scale: '1:1', width: 6, height: 6, componentId: id });
        this.selectedComponentId = id;
        this.selectedComponentType = 'CAD::Viewport';
        this.updateAndNotify();
      }
    });

    const btnToggleLeft = this.rightPanel.querySelector('#btn-toggle-left-pane') as HTMLButtonElement;
    if (btnToggleLeft) {
      if (this.options.showLeftToggle === false) {
        btnToggleLeft.style.display = 'none';
      } else {
        btnToggleLeft.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('dac-toggle-left-pane'));
        });
      }
    }

    const btnToggleRight = this.rightPanel.querySelector('#btn-toggle-right-pane') as HTMLButtonElement;
    if (btnToggleRight) {
      if (this.options.showRightToggle === false) {
        btnToggleRight.style.display = 'none';
      } else {
        btnToggleRight.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('dac-toggle-right-pane'));
        });
      }
    }
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

  private findDocumentForComponent(docId: string): DetailDocument | null {
    if (this.doc.type === 'CAD::Detail') {
      return this.doc as DetailDocument;
    }
    let sheet: SheetDocument;
    if (this.doc.type === 'CAD::DrawingSet') {
      const ds = this.doc as DrawingSetDocument;
      sheet = ds.sheets[this.activeSheetIndex] as SheetDocument;
    } else {
      sheet = this.doc as SheetDocument;
    }

    const docContainsSelected = (d: DetailDocument | undefined): boolean => {
      if (!d) return false;
      if (d.parameters) {
        for (const param of Object.values(d.parameters)) {
          if (param.componentId === docId) return true;
        }
      }
      if (d.geometry && Array.isArray(d.geometry)) {
        let autoIndex = 0;
        for (const shape of d.geometry) {
          const cid = shape.componentId || 'shape_' + autoIndex++;
          if (cid === docId) return true;
        }
      }
      return false;
    };

    if (sheet.titleBlock && typeof sheet.titleBlock === 'string') {
      const tbDoc = this.titleBlockMap.get(sheet.titleBlock);
      if (docContainsSelected(tbDoc)) return tbDoc!;
    }

    for (const vp of sheet.viewports) {
      const vDoc = typeof vp.detail === 'string' ? this.viewportsMap.get(vp.detail) : vp.detail;
      if (docContainsSelected(vDoc)) {
        return vDoc!;
      }
    }
    return null;
  }

  /**
   * Generates dynamic form sliders for parameter variables associated with the selection
   */
  private renderPropertyEditor() {
    if (!this.propertiesCardContainer) return;

    if (!this.selectedComponentId) {
      // Nothing selected, render Document Properties
      this.propertiesCardContainer.innerHTML = `
        <div class="card">
          <div class="properties-editor-body">
            ${DocumentEditor.renderHTML(this.doc, this.getActiveSheet())}
          </div>
        </div>
      `;
      DocumentEditor.bindListeners({
        container: this.propertiesCardContainer,
        getLatestDoc: () => {
          this.lastUpdateTime = Date.now();
          return this.doc;
        },
        getActiveSheet: () => {
          this.lastUpdateTime = Date.now();
          return this.getActiveSheet();
        },
        updateAndNotify: () => this.updateAndNotify()
      });
      this.injectInlineApplyButtons();
      return;
    }

    if (this.selectedComponentType === 'CAD::Viewport') {
      const activeSheet = this.getActiveSheet();
      if (!activeSheet || !activeSheet.viewports) return;
      
      const vpIndex = activeSheet.viewports.findIndex(v => v.componentId === this.selectedComponentId);
      if (vpIndex === -1) return;
      const vp = activeSheet.viewports[vpIndex];

      this.propertiesCardContainer.innerHTML = `
        <div class="card">
          <h3>Viewport Properties</h3>
          <div class="properties-editor-body">
            ${ViewportEditor.renderHTML(vp, vpIndex)}
          </div>
        </div>
      `;

      ViewportEditor.bindListeners({
        container: this.propertiesCardContainer,
        shapeIndex: vpIndex,
        getLatestShape: () => {
          this.lastUpdateTime = Date.now();
          const sheet = this.getActiveSheet();
          return sheet && sheet.viewports ? sheet.viewports[vpIndex] : null;
        },
        updateAndNotify: () => this.updateAndNotify()
      });
      this.injectInlineApplyButtons();
      return;
    }

    // We must find which detail document the component belongs to.
    const targetDoc = this.findDocumentForComponent(this.selectedComponentId);

    if (!targetDoc) {
      this.propertiesCardContainer.innerHTML = `
        <div class="card">
          <div class="card-body" style="color: var(--vscode-descriptionForeground); text-align: center;">
            No document found for selection.
          </div>
        </div>
      `;
      return;
    }

    // Filter parameters belonging to the selected componentId
    const componentParams: [string, any][] = [];
    if (targetDoc.parameters) {
      for (const [key, param] of Object.entries(targetDoc.parameters)) {
        if (param.componentId === this.selectedComponentId) {
          componentParams.push([key, param]);
        }
      }
    }

    // Find matching geometry shapes for direct property editing (Text, Font Size, Stroke Width)
    const matchingShapes: { shape: any; index: number }[] = [];
    if (targetDoc.geometry && Array.isArray(targetDoc.geometry)) {
      let autoIndex = 0;
      targetDoc.geometry.forEach((shape, idx) => {
        const cid = shape.componentId || 'shape_' + autoIndex++;
        if (cid === this.selectedComponentId) {
          matchingShapes.push({ shape, index: idx });
        }
      });
    }

    const niceName = this.selectedComponentType?.split('::').pop() || 'Selected Component';

    if (componentParams.length === 0 && matchingShapes.length === 0) {
      this.propertiesCardContainer.innerHTML = `
        <div class="card">
          <h3>${niceName}</h3>
          <div class="card-body" style="color: var(--vscode-descriptionForeground); text-align: center; padding: 16px;">
            This component contains no editable properties.
          </div>
        </div>
      `;
      return;
    }

    let controlsHtml = '';
    let shapesHtml = '';

    const isParametricConstruct = componentParams.length > 0;

    if (isParametricConstruct) {
      controlsHtml = ParametricEditor.renderHTML(componentParams);
    } else {
      shapesHtml = matchingShapes.map(({ shape, index }) => {
        const editor = getEditorForShape(shape.type);
        return editor.renderHTML(shape, index);
      }).join('');
    }

    this.propertiesCardContainer.innerHTML = `
      <div class="card">
        <h3>${niceName}</h3>
        <div class="properties-editor-body">
          ${controlsHtml}
          ${shapesHtml}
        </div>
      </div>
    `;

    if (isParametricConstruct) {
      ParametricEditor.bindListeners({
        container: this.propertiesCardContainer,
        componentParams,
        getLatestDoc: () => {
          this.lastUpdateTime = Date.now();
          return this.findDocumentForComponent(this.selectedComponentId!) || (this.doc as DetailDocument);
        },
        updateAndNotify: () => this.updateAndNotify()
      });
    } else {
      matchingShapes.forEach(({ shape, index }) => {
        const editor = getEditorForShape(shape.type);
        editor.bindListeners({
          container: this.propertiesCardContainer,
          shapeIndex: index,
          getLatestShape: () => {
            this.lastUpdateTime = Date.now();
            const latestDoc = this.findDocumentForComponent(this.selectedComponentId!) || (this.doc as DetailDocument);
            return latestDoc.geometry && Array.isArray(latestDoc.geometry) ? latestDoc.geometry[index] : null;
          },
          updateAndNotify: () => this.updateAndNotify()
        });
      });
    }
    
    this.injectInlineApplyButtons();
  }

  private injectInlineApplyButtons() {
    if (!this.propertiesCardContainer) return;
    
    const textInputs = this.propertiesCardContainer.querySelectorAll('input[type="text"], input[type="number"]');
    textInputs.forEach(input => {
      // Don't inject if it already has one or is part of a complex slider group
      if (input.parentElement && input.parentElement.classList.contains('param-slider-group')) return;

      const htmlInput = input as HTMLInputElement;

      // Create a wrapper to contain the input and the absolutely positioned button
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position: relative; display: flex; align-items: center; justify-content: flex-end;';
      
      // Fix field widths: copy inline width if exists, otherwise expand text fields
      if (htmlInput.style.width) {
        wrapper.style.width = htmlInput.style.width;
      } else if (htmlInput.type === 'text') {
        wrapper.style.width = '140px'; 
      } else {
        wrapper.style.width = '55px'; // .precise-input CSS default
      }

      // Insert wrapper and move input inside
      htmlInput.parentNode?.insertBefore(wrapper, htmlInput);
      wrapper.appendChild(htmlInput);

      // Make input fill wrapper and leave padding for the button
      htmlInput.style.width = '100%';
      htmlInput.style.boxSizing = 'border-box';
      htmlInput.style.paddingRight = '18px';

      const btn = document.createElement('button');
      btn.innerHTML = '✓';
      btn.title = "Apply Change";
      btn.className = 'inline-apply-btn';
      btn.style.cssText = 'display: none; background: transparent; border: none; color: #22c55e; cursor: pointer; padding: 0; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-weight: bold; font-size: 14px; outline: none; z-index: 10;';
      
      wrapper.appendChild(btn);

      htmlInput.addEventListener('input', () => {
        btn.style.display = 'block';
      });

      // Use mousedown so it fires before the input loses focus and triggers 'change' automatically
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); 
        htmlInput.blur();
      });

      htmlInput.addEventListener('change', () => {
        btn.style.display = 'none';
      });
    });
  }

  private renderSVG() {
    try {
      let svg = '';
      if (this.isDrawingSet() || this.doc.type === 'CAD::Sheet') {
        let sheet: SheetDocument;
        let titleBlockData: Record<string, any> = {};
        let fallbackTb = '';
        let fallbackX = 0;
        let fallbackY = 0;

        if (this.doc.type === 'CAD::DrawingSet') {
          const ds = this.doc as DrawingSetDocument;
          sheet = ds.sheets[this.activeSheetIndex] as SheetDocument;
          titleBlockData = ds.titleBlockData ? { ...ds.titleBlockData } : {};
          fallbackTb = (ds.titleBlock as string) || '';
          fallbackX = ds.titleBlockOffsetX || 0;
          fallbackY = ds.titleBlockOffsetY || 0;
          if (ds.project) {
            titleBlockData['ProjectName'] = ds.project;
            titleBlockData['projectName'] = ds.project;
          }
        } else {
          sheet = this.doc as SheetDocument;
        }

        if (sheet.sheetName) {
          titleBlockData['SheetName'] = sheet.sheetName;
          titleBlockData['sheetName'] = sheet.sheetName;
        }
        if (sheet.sheetNumber) {
          titleBlockData['SheetNumber'] = sheet.sheetNumber;
          titleBlockData['sheetNumber'] = sheet.sheetNumber;
        }

        let titleBlockDoc: DetailDocument | undefined = undefined;
        const resolvedTb = (sheet.titleBlock as string) || fallbackTb;
        
        if (resolvedTb) {
          titleBlockDoc = this.titleBlockMap.get(resolvedTb);
        }
        
        const effectiveX = sheet.titleBlockOffsetX !== undefined ? sheet.titleBlockOffsetX : fallbackX;
        const effectiveY = sheet.titleBlockOffsetY !== undefined ? sheet.titleBlockOffsetY : fallbackY;

        svg = renderSheet(sheet, titleBlockData, this.viewportsMap, titleBlockDoc, effectiveX, effectiveY);
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

      const isDetail = this.doc.type === 'CAD::Detail';
      const btnAddRect = this.rightPanel.querySelector('#btn-add-rect') as HTMLButtonElement;
      const btnAddLine = this.rightPanel.querySelector('#btn-add-line') as HTMLButtonElement;
      const btnAddText = this.rightPanel.querySelector('#btn-add-text') as HTMLButtonElement;
      const btnAddViewport = this.rightPanel.querySelector('#btn-add-viewport') as HTMLButtonElement;
      const headerDivider = this.rightPanel.querySelector('#canvas-header-divider') as HTMLElement;

      if (this.isDrawingSet() || this.doc.type === 'CAD::Sheet') {
        if (btnAddRect) btnAddRect.style.display = 'none';
        if (btnAddLine) btnAddLine.style.display = 'none';
        if (btnAddText) btnAddText.style.display = 'none';
        if (btnAddViewport) btnAddViewport.style.display = 'block';
      } else {
        if (btnAddRect) btnAddRect.style.display = 'block';
        if (btnAddLine) btnAddLine.style.display = 'block';
        if (btnAddText) btnAddText.style.display = 'block';
        if (btnAddViewport) btnAddViewport.style.display = 'none';
      }
      if (headerDivider) headerDivider.style.display = isDetail ? 'block' : 'none';
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
    this.onChange(this.doc, this.viewportsMap, this.titleBlockMap);
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

  public resetView() {
    this.selectedComponentId = null;
    this.selectedComponentType = null;

    // Temporarily disable transition for synchronous measurement
    const origTransition = this.svgWrapper.style.transition;
    this.svgWrapper.style.transition = 'none';
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.updateZoomPan();

    const extentsEl = this.svgWrapper.querySelector('.drawing-extents') as SVGElement | null;
    if (extentsEl && this.svgViewport) {
      const viewportRect = this.svgViewport.getBoundingClientRect();
      const extentsRect = extentsEl.getBoundingClientRect();

      if ((extentsRect.width > 0 || extentsRect.height > 0) && viewportRect.width > 0 && viewportRect.height > 0) {
        const padding = 60; // 30px padding on edges
        const availableWidth = Math.max(10, viewportRect.width - padding);
        const availableHeight = Math.max(10, viewportRect.height - padding);

        const scaleX = extentsRect.width > 0 ? availableWidth / extentsRect.width : 10.0;
        const scaleY = extentsRect.height > 0 ? availableHeight / extentsRect.height : 10.0;
        const newZoom = Math.max(0.05, Math.min(10.0, Math.min(scaleX, scaleY)));

        const extentsCenterX = (extentsRect.left - viewportRect.left) + extentsRect.width / 2;
        const extentsCenterY = (extentsRect.top - viewportRect.top) + extentsRect.height / 2;

        this.zoom = newZoom;
        this.panX = (viewportRect.width / 2) - extentsCenterX * this.zoom;
        this.panY = (viewportRect.height / 2) - extentsCenterY * this.zoom;
      }
    }

    // Restore transition
    this.svgWrapper.style.transition = origTransition;
    this.render();
  }

  public selectComponent(componentId: string | null, componentType: string | null = null) {
    this.selectedComponentId = componentId;
    this.selectedComponentType = componentType;
    this.render();
  }

  public render() {
    this.renderSheetDropdown();
    this.renderSVG();
    this.renderPropertyEditor();
    this.updateZoomPan();
  }
}
