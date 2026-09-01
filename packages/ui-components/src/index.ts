import { PropertiesManager } from './managers/PropertiesManager';
import { CanvasManager } from './managers/CanvasManager';
import { InteractionManager } from './managers/InteractionManager';
import { getVisualizerShellTemplate } from './templates';

import { DetailDocument, ProjectDocument, SheetConfiguration, TitleBlockDocument, renderDetail, renderSheet, resolveScaleMultiplier } from '@aeckit/core-solver';
import { getEditorForShape, ParametricEditor, DocumentEditor, ViewportEditor } from './editors';
import { Viewport } from '@aeckit/core-solver';
import { ParametricEditorContext, PropertyEditorContext } from './editors/types';
export type VisualizerDocument = DetailDocument | ProjectDocument | SheetConfiguration | TitleBlockDocument | any; // using any for ConstructDocument as a quick workaround if it's not exported from core-solver index.

export interface VisualizerUIOptions {
  showLeftToggle?: boolean;  // default: true
  showRightToggle?: boolean; // default: true
  parentProject?: ProjectDocument;
  sheetsMap?: Map<string, SheetConfiguration>;
  editorFactory?: (container: HTMLElement, initialValue: string, onChange: (value: string) => void) => any;
  onSelectionChange?: (selectedIds: string[], primaryType: string | null) => void;
  constructResolver?: (id: string) => any;
  activeFilename?: string;
  onFileRename?: (newName: string) => void;
}

export class VisualizerUI {
  public container: HTMLElement;
  public doc: VisualizerDocument;
  public viewportsMap: Map<string, DetailDocument>;
  public titleBlockMap: Map<string, TitleBlockDocument | DetailDocument>;
  public onChange: (doc: VisualizerDocument, viewportsMap?: Map<string, DetailDocument>, titleBlockMap?: Map<string, TitleBlockDocument | DetailDocument>) => void;
  public options: VisualizerUIOptions;

  // Drawing Set state
  public activeSheetIndex = 0;
  public sandboxWidth = 24;
  public sandboxHeight = 18;

  // Selection state
  public selectedComponentIds: Set<string> = new Set();
  public primaryComponentType: string | null = null;

  // Zoom & Pan state
  public zoom = 1.0;
  public panX = 0;
  public panY = 0;
  public isDragging = false;
  public startX = 0;
  public startY = 0;
  public lastUpdateTime = 0;

  // DOM references
  public leftPanel!: HTMLElement;
  public rightPanel!: HTMLElement;
  public svgViewport!: HTMLElement;
  public svgWrapper!: HTMLElement;
  public propertiesCardContainer!: HTMLElement;
  public sheetDropdownContainer!: HTMLElement;
  public editOverlay!: HTMLElement;
  public btnMoveOverlay!: HTMLElement;
  public croppingComponentId: string | null = null;
  public btnCropOverlay!: HTMLElement;
  public btnDeleteOverlay!: HTMLElement;
  public btnOpenOverlay!: HTMLElement;
  public grabbers: Record<string, HTMLElement> = {};
  public propertiesManager!: PropertiesManager;
  public canvasManager!: CanvasManager;
  public interactionManager!: InteractionManager;

  constructor(
    container: HTMLElement,
    initialDoc: VisualizerDocument,
    onChange: (doc: VisualizerDocument, viewportsMap?: Map<string, DetailDocument>, titleBlockMap?: Map<string, TitleBlockDocument | DetailDocument>) => void,
    viewportsMap?: Map<string, DetailDocument>,
    titleBlockMap?: Map<string, TitleBlockDocument | DetailDocument>,
    options?: VisualizerUIOptions
  ) {
    this.container = container;
    this.doc = JSON.parse(JSON.stringify(initialDoc));
    this.viewportsMap = viewportsMap || new Map();
    this.titleBlockMap = titleBlockMap || new Map();
    this.onChange = onChange;
    this.options = options || {};

    this.propertiesManager = new PropertiesManager(this);
    this.canvasManager = new CanvasManager(this);
    this.interactionManager = new InteractionManager(this);
    this.initLayout();
    this.render();
    this.canvasManager.setupListeners();
    this.interactionManager.setupListeners();
  }

  public isProject(): boolean {
    return this.doc.type === 'CAD::Project';
  }

  public getActiveSheet(): SheetConfiguration | null {
    if (this.doc.type === 'CAD::SheetConfiguration') {
      return this.doc as SheetConfiguration;
    }
    if (this.isProject()) {
      const ds = this.doc as ProjectDocument;
      return this.resolveSheet(ds.sheets[this.activeSheetIndex]);
    }
    return null;
  }

  public getSelectedComponentIds(): string[] {
    return Array.from(this.selectedComponentIds);
  }

  public getPrimaryComponentType(): string | null {
    return this.primaryComponentType;
  }

  public resolveSheet(sheetRef: string | SheetConfiguration): SheetConfiguration | null {
    if (typeof sheetRef === 'string') {
      return this.options.sheetsMap?.get(sheetRef) || null;
    }
    return sheetRef;
  }

  public insertViewport(detailName: string) {
    const activeSheet = this.getActiveSheet();
    if (activeSheet) {
      if (!activeSheet.viewports) activeSheet.viewports = [];
      const id = 'viewport_' + Date.now().toString(36);
      const detailNumber = String(activeSheet.viewports.length + 1);
      activeSheet.viewports.push({ 
        detail: detailName, 
        x: 2, 
        y: 2, 
        width: 10, 
        height: 8, 
        scale: '1:1', 
        detailNumber,
        componentId: id 
      });
      this.updateAndNotify();
    }
  }

  private initLayout() {
    this.container.className = 'visualizer-container';

    // Scale settings are only relevant if it's a DetailDocument (since sheets are always 1:1 paper)
    const globalSettingsHtml = (this.doc.type === 'CAD::Detail' || this.doc.type === 'CAD::TitleBlock') ? `
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

    this.container.innerHTML = getVisualizerShellTemplate(this.doc, globalSettingsHtml);

    this.leftPanel = this.container.querySelector('#left-sidebar') as HTMLElement;
    this.rightPanel = this.container.querySelector('#right-canvas') as HTMLElement;
    this.propertiesCardContainer = this.container.querySelector('#properties-card-container') as HTMLElement;
    this.sheetDropdownContainer = this.container.querySelector('#sheet-dropdown-container') as HTMLElement;
    this.svgViewport = this.container.querySelector('#svg-viewport-container') as HTMLElement;
    this.svgWrapper = this.container.querySelector('#svg-viewport-wrapper') as HTMLElement;
    this.editOverlay = this.container.querySelector('#canvas-edit-overlay') as HTMLElement;
    this.btnMoveOverlay = this.container.querySelector('#edit-overlay-btn-move') as HTMLElement;
    this.btnCropOverlay = this.container.querySelector('#edit-overlay-btn-crop') as HTMLElement;
    this.btnDeleteOverlay = this.container.querySelector('#edit-overlay-btn-delete') as HTMLElement;
    this.btnOpenOverlay = this.container.querySelector('#edit-overlay-btn-open') as HTMLElement;
    
    this.grabbers = {};
    const grabberEls = this.container.querySelectorAll('.edit-grabber');
    grabberEls.forEach(el => {
      const dir = el.getAttribute('data-dir');
      if (dir) {
        this.grabbers[dir] = el as HTMLElement;
      }
    });

    if ((this.doc.type === 'CAD::Detail' || this.doc.type === 'CAD::TitleBlock')) {
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
            if ((this.doc.type === 'CAD::Detail' || this.doc.type === 'CAD::TitleBlock')) {
              this.renderSVG();
            }
          }
        }
      }
    });
    resizeObserver.observe(this.svgViewport);

    const resetBtn = this.rightPanel.querySelector('#reset-view-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => {
      this.canvasManager.resetView();
    });

    const btnAddRect = this.rightPanel.querySelector('#btn-add-rect') as HTMLButtonElement;
    btnAddRect?.addEventListener('click', () => {
      const isProject = this.isProject();
      if (!isProject && (this.doc.type !== 'CAD::Detail' && this.doc.type !== 'CAD::TitleBlock')) return;
      const targetDoc = (isProject ? this.getActiveSheet() : this.doc) as any;
      if (!targetDoc) return;
      if (!targetDoc.geometry) targetDoc.geometry = [];
      const id = 'rect_' + Date.now().toString(36);
      const offset = targetDoc.geometry.length * 0.5;
      targetDoc.geometry.push({ type: 'CAD::Shape::Rectangle', componentId: id, componentType: 'Rectangle', x: offset, y: offset, width: 12, height: 12, fill: 'gray' });
      this.selectedComponentIds.clear();
      this.selectedComponentIds.add(id);
      this.primaryComponentType = 'CAD::Shape::Rectangle';
      this.updateAndNotify();
    });

    const btnAddLine = this.rightPanel.querySelector('#btn-add-line') as HTMLButtonElement;
    btnAddLine?.addEventListener('click', () => {
      const isProject = this.isProject();
      if (!isProject && (this.doc.type !== 'CAD::Detail' && this.doc.type !== 'CAD::TitleBlock')) return;
      const targetDoc = (isProject ? this.getActiveSheet() : this.doc) as any;
      if (!targetDoc) return;
      if (!targetDoc.geometry) targetDoc.geometry = [];
      const id = 'line_' + Date.now().toString(36);
      const offset = targetDoc.geometry.length * 0.5;
      targetDoc.geometry.push({ type: 'CAD::Shape::Line', componentId: id, componentType: 'Line', x1: offset, y1: offset, x2: 12 + offset, y2: 12 + offset, strokeWidth: 2 });
      this.selectedComponentIds.clear();
      this.selectedComponentIds.add(id);
      this.primaryComponentType = 'CAD::Shape::Line';
      this.updateAndNotify();
    });

    const btnAddText = this.rightPanel.querySelector('#btn-add-text') as HTMLButtonElement;
    btnAddText?.addEventListener('click', () => {
      const isProject = this.isProject();
      if (!isProject && (this.doc.type !== 'CAD::Detail' && this.doc.type !== 'CAD::TitleBlock')) return;
      const targetDoc = (isProject ? this.getActiveSheet() : this.doc) as any;
      if (!targetDoc) return;
      if (!targetDoc.geometry) targetDoc.geometry = [];
      const id = 'text_' + Date.now().toString(36);
      const offset = targetDoc.geometry.length * 0.5;
      targetDoc.geometry.push({ type: 'CAD::Annotation::Text', componentId: id, componentType: 'Text', x: offset, y: offset, text: 'New Text', fontSize: 4 });
      this.selectedComponentIds.clear();
      this.selectedComponentIds.add(id);
      this.primaryComponentType = 'CAD::Annotation::Text';
      this.updateAndNotify();
    });

    const btnAddImage = this.rightPanel.querySelector('#btn-add-image') as HTMLButtonElement;
    btnAddImage?.addEventListener('click', () => {
      const isProject = this.isProject();
      if (!isProject && (this.doc.type !== 'CAD::Detail' && this.doc.type !== 'CAD::TitleBlock')) return;
      const targetDoc = (isProject ? this.getActiveSheet() : this.doc) as any;
      if (!targetDoc) return;
      if (!targetDoc.geometry) targetDoc.geometry = [];
      
      const id = 'image_' + Date.now().toString(36);
      const offset = targetDoc.geometry.length * 0.5;
      
      targetDoc.geometry.push({
        type: 'CAD::Annotation::Image',
        componentId: id,
        componentType: 'Image',
        href: '',
        x: 0,
        y: 0,
        width: 12,
        height: 9,
        cropX: 0,
        cropY: 0,
        imgWidth: 12,
        imgHeight: 9,
        lockAspectRatio: true
      });
      this.selectedComponentIds.clear();
      this.selectedComponentIds.add(id);
      this.primaryComponentType = 'CAD::Annotation::Image';
      this.updateAndNotify();
    });

    const btnAddViewport = this.rightPanel.querySelector('#btn-add-viewport') as HTMLButtonElement;
    btnAddViewport?.addEventListener('click', () => {
      const activeSheet = this.getActiveSheet();
      if (activeSheet) {
        if (!activeSheet.viewports) activeSheet.viewports = [];
        const id = 'viewport_' + Date.now().toString(36);
        const offset = 2 + (activeSheet.viewports.length * 2);
        activeSheet.viewports.push({ detail: '', x: offset, y: offset, scale: '1:1', width: 6, height: 6, componentId: id });
        this.selectedComponentIds.clear();
        this.selectedComponentIds.add(id);
        this.primaryComponentType = 'CAD::Viewport';
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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.selectedComponentIds.size > 0) {
          this.selectComponent(null);
        }
      }
    });
  }

  private renderSheetDropdown() {
    if (!this.isProject()) {
      this.sheetDropdownContainer.innerHTML = '';
      return;
    }

    const ds = this.doc as ProjectDocument;

    let optionsHtml = '';
    if (ds.sheets && ds.sheets.length > 0) {
      ds.sheets.forEach((sheetObj, index) => {
        const s = sheetObj as SheetConfiguration;
        optionsHtml += `<option value="${index}" ${index === this.activeSheetIndex ? 'selected' : ''}>${s.sheetNumber || 'Unnamed'} - ${s.sheetName || 'Unnamed'}</option>`;
      });
    } else {
      optionsHtml = `<option value="0" disabled selected>No sheets</option>`;
    }

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
      this.selectedComponentIds.clear(); // Clear selection when switching sheets
      this.primaryComponentType = null;
      if (this.options.onSelectionChange) this.options.onSelectionChange([], null);
      this.render();
    });
  }

  
  public getSelectedShape(): any {
    if (this.selectedComponentIds.size === 0) return null;
    const cid = Array.from(this.selectedComponentIds)[0]; // Primarily used when 1 item is selected

    if (this.primaryComponentType === 'CAD::Viewport') {
      const activeSheet = this.getActiveSheet();
      if (activeSheet && activeSheet.viewports) {
        return activeSheet.viewports.find(v => v.componentId === cid) || null;
      }
      return null;
    }

    const doc = this.findDocumentForComponent(cid);
    if (doc && doc.geometry) {
      let autoIndex = 0;
      return doc.geometry.find(shape => {
        const sid = shape.componentId || 'shape_' + autoIndex++;
        return sid === cid;
      }) || null;
    }
    return null;
  }

  public updatePrimaryComponentType() {
    if (this.selectedComponentIds.size === 1) {
      const cid = Array.from(this.selectedComponentIds)[0];
      const selectedGroup = this.svgWrapper.querySelector(`[data-component-id="${cid}"]`);
      this.primaryComponentType = selectedGroup ? selectedGroup.getAttribute('data-component-type') : null;
    } else if (this.selectedComponentIds.size > 1) {
      this.primaryComponentType = 'Multiple';
    } else {
      this.primaryComponentType = null;
    }
  }

  public findDocumentForComponent(docId: string): DetailDocument | null {
    if (this.doc.type === 'CAD::Detail' || this.doc.type === 'CAD::TitleBlock' || this.doc.type === 'CAD::Construct') {
      return this.doc as any;
    }
    let sheet: SheetConfiguration | null = null;
    if (this.doc.type === 'CAD::Project') {
      const ds = this.doc as ProjectDocument;
      sheet = this.resolveSheet(ds.sheets[this.activeSheetIndex]);
    } else {
      sheet = this.doc as SheetConfiguration;
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

    if (!sheet) return null;

    for (const vp of sheet.viewports) {
      const vDoc = typeof vp.detail === 'string' ? this.viewportsMap.get(vp.detail) : vp.detail;
      if (docContainsSelected(vDoc)) {
        return vDoc!;
      }
    }
    return null;
  }

  
  
  private renderSVG() {
    try {
      let svg = '';
      if (this.isProject() || this.doc.type === 'CAD::SheetConfiguration') {
        let sheet: SheetConfiguration | null = null;
        let titleBlockData: Record<string, any> = {};
        let fallbackTb = '';
        let fallbackX = 0;
        let fallbackY = 0;
        let fallbackPaperSize = 'ARCH D';

        if (this.doc.type === 'CAD::Project') {
          const ds = this.doc as ProjectDocument;
          sheet = this.resolveSheet(ds.sheets[this.activeSheetIndex]);
          titleBlockData = {};
          fallbackTb = (ds.defaultTitleBlockRef as string) || '';
          fallbackX = ds.titleBlockOffsetX || 0;
          fallbackY = ds.titleBlockOffsetY || 0;
          fallbackPaperSize = ds.defaultPaperSize || 'ARCH D';
          if (ds.projectName) {
            titleBlockData['ProjectName'] = ds.projectName;
            titleBlockData['projectName'] = ds.projectName;
          }
          if (ds.parameters) {
            Object.assign(titleBlockData, ds.parameters);
          }
        } else {
          sheet = this.doc as SheetConfiguration;
          if (this.options.parentProject) {
            fallbackTb = (this.options.parentProject.defaultTitleBlockRef as string) || '';
            fallbackX = this.options.parentProject.titleBlockOffsetX || 0;
            fallbackY = this.options.parentProject.titleBlockOffsetY || 0;
            fallbackPaperSize = this.options.parentProject.defaultPaperSize || 'ARCH D';
            if (this.options.parentProject.projectName) {
              titleBlockData['ProjectName'] = this.options.parentProject.projectName;
              titleBlockData['projectName'] = this.options.parentProject.projectName;
            }
            if (this.options.parentProject.parameters) {
              Object.assign(titleBlockData, this.options.parentProject.parameters);
            }
          }
        }

        if (!sheet) {
          return '';
        }

        if (!sheet) {
          this.svgWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="background-color: #0f172a;"><text x="50%" y="50%" fill="#94a3b8" text-anchor="middle">No sheets found in Drawing Set</text></svg>`;
          this.interactionManager.updateOverlayPositions();
          return;
        }

        if (sheet.sheetName) {
          titleBlockData['SheetName'] = sheet.sheetName;
          titleBlockData['sheetName'] = sheet.sheetName;
        }
        if (sheet.sheetNumber) {
          titleBlockData['SheetNumber'] = sheet.sheetNumber;
          titleBlockData['sheetNumber'] = sheet.sheetNumber;
        }

        let titleBlockDoc: TitleBlockDocument | DetailDocument | undefined = undefined;
        const resolvedTb = fallbackTb;
        
        if (resolvedTb) {
          titleBlockDoc = this.titleBlockMap.get(resolvedTb);
        }
        
        const effectiveX = sheet.titleBlockOffsetX !== undefined ? sheet.titleBlockOffsetX : fallbackX;
        const effectiveY = sheet.titleBlockOffsetY !== undefined ? sheet.titleBlockOffsetY : fallbackY;

        svg = renderSheet(sheet, titleBlockData, this.viewportsMap, titleBlockDoc as any, effectiveX, effectiveY, fallbackPaperSize, this.options.constructResolver);
      } else {
        svg = renderDetail(this.doc as DetailDocument, this.sandboxWidth, this.sandboxHeight, this.options.constructResolver);
      }

      this.svgWrapper.innerHTML = svg;

      // Handle image fallbacks
      const images = this.svgWrapper.querySelectorAll('image[data-fallback-id]');
      images.forEach(img => {
        const fallbackId = img.getAttribute('data-fallback-id');
        const fallbackEl = this.svgWrapper.querySelector(`#${fallbackId}`);
        if (fallbackEl) {
          const href = img.getAttribute('href');
          if (!href) return;
          
          const handleLoad = () => fallbackEl.setAttribute('display', 'none');
          const handleError = () => fallbackEl.setAttribute('display', 'block');
          
          img.addEventListener('load', handleLoad);
          img.addEventListener('error', handleError);
          
          const htmlImg = new Image();
          htmlImg.onload = handleLoad;
          htmlImg.onerror = handleError;
          htmlImg.src = href;
        }
      });

      if (this.selectedComponentIds.size > 0) {
        this.selectedComponentIds.forEach(cid => {
          const selectedGroup = this.svgWrapper.querySelector(`[data-component-id="${cid}"]`) as SVGElement | null;
          if (selectedGroup) {
            selectedGroup.classList.add('selected-highlight');
          }
        });
      }

      const isDetail = (this.doc.type === 'CAD::Detail' || this.doc.type === 'CAD::TitleBlock');
      const btnAddRect = this.rightPanel.querySelector('#btn-add-rect') as HTMLButtonElement;
      const btnAddLine = this.rightPanel.querySelector('#btn-add-line') as HTMLButtonElement;
      const btnAddText = this.rightPanel.querySelector('#btn-add-text') as HTMLButtonElement;
      const btnAddImage = this.rightPanel.querySelector('#btn-add-image') as HTMLButtonElement;
      const btnAddViewport = this.rightPanel.querySelector('#btn-add-viewport') as HTMLButtonElement;
      const headerDivider = this.rightPanel.querySelector('#canvas-header-divider') as HTMLElement;

      if (this.isProject() || this.doc.type === 'CAD::SheetConfiguration') {
        if (btnAddRect) { btnAddRect.disabled = true; btnAddRect.style.opacity = '0.3'; btnAddRect.style.cursor = 'not-allowed'; }
        if (btnAddLine) { btnAddLine.disabled = true; btnAddLine.style.opacity = '0.3'; btnAddLine.style.cursor = 'not-allowed'; }
        if (btnAddText) { btnAddText.disabled = true; btnAddText.style.opacity = '0.3'; btnAddText.style.cursor = 'not-allowed'; }
        if (btnAddImage) { btnAddImage.disabled = true; btnAddImage.style.opacity = '0.3'; btnAddImage.style.cursor = 'not-allowed'; }
        if (btnAddViewport) { btnAddViewport.disabled = false; btnAddViewport.style.opacity = '1'; btnAddViewport.style.cursor = 'pointer'; }
      } else {
        if (btnAddRect) { btnAddRect.disabled = false; btnAddRect.style.opacity = '1'; btnAddRect.style.cursor = 'pointer'; }
        if (btnAddLine) { btnAddLine.disabled = false; btnAddLine.style.opacity = '1'; btnAddLine.style.cursor = 'pointer'; }
        if (btnAddText) { btnAddText.disabled = false; btnAddText.style.opacity = '1'; btnAddText.style.cursor = 'pointer'; }
        if (btnAddImage) { btnAddImage.disabled = false; btnAddImage.style.opacity = '1'; btnAddImage.style.cursor = 'pointer'; }
        if (btnAddViewport) { btnAddViewport.disabled = true; btnAddViewport.style.opacity = '0.3'; btnAddViewport.style.cursor = 'not-allowed'; }
      }
      if (headerDivider) headerDivider.style.display = isDetail ? 'block' : 'none';

      const viewTypeBadge = this.rightPanel.querySelector('#canvas-view-type-badge') as HTMLElement;
      if (viewTypeBadge) {
        if (this.doc.type === 'CAD::Project') {
          viewTypeBadge.textContent = 'SET VIEW';
        } else if (this.doc.type === 'CAD::SheetConfiguration') {
          viewTypeBadge.textContent = 'SHEET VIEW';
        } else if ((this.doc.type === 'CAD::Detail' || this.doc.type === 'CAD::TitleBlock')) {
          viewTypeBadge.textContent = 'DETAIL VIEW';
        } else {
          viewTypeBadge.textContent = (this.doc as any).type || 'UNKNOWN';
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

  public updateAndNotify() {
    this.renderSVG();
    this.onChange(this.doc, this.viewportsMap, this.titleBlockMap);
  }

  public updateConfig(newDoc: VisualizerDocument, viewportsMap?: Map<string, DetailDocument>, titleBlockMap?: Map<string, TitleBlockDocument | DetailDocument>, sheetsMap?: Map<string, SheetConfiguration>, parentProject?: ProjectDocument | null) {
    this.doc = JSON.parse(JSON.stringify(newDoc));
    if (viewportsMap) this.viewportsMap = viewportsMap;
    if (titleBlockMap) this.titleBlockMap = titleBlockMap;
    if (this.options) {
      if (sheetsMap) this.options.sheetsMap = sheetsMap;
      if (parentProject !== undefined) this.options.parentProject = parentProject || undefined;
    }

    // Maintain selection state
    this.renderSVG();
    if (Date.now() - this.lastUpdateTime > 500) {
      this.propertiesManager.renderPropertyEditor(); // Re-render props since we don't have updatePropertyValues hooked up fully for DrawingSets yet
    }
  }

  public selectComponent(componentId: string | null, componentType: string | null = null) {
    this.selectedComponentIds.clear();
    if (componentId) this.selectedComponentIds.add(componentId);
    if (componentType) this.primaryComponentType = componentType;
    
    if (this.options.onSelectionChange) {
      this.options.onSelectionChange(this.getSelectedComponentIds(), this.primaryComponentType);
    }
    
    this.render();
  }

  public resetView() {
    this.canvasManager.resetView();
  }

  public render() {
    this.renderSheetDropdown();
    this.renderSVG();
    this.propertiesManager.renderPropertyEditor();
    this.canvasManager.updateZoomPan();
  }
}
