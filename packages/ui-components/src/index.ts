import { PropertiesManager } from './managers/PropertiesManager';
import { CanvasManager } from './managers/CanvasManager';
import { InteractionManager } from './managers/InteractionManager';
import { LayoutManager } from './managers/LayoutManager';
import { RenderManager } from './managers/RenderManager';
import { getVisualizerShellTemplate } from './templates';
import { JsonBuilder as DacEngine } from '@dac/json-builder';

import type { DetailDocument, ProjectDocument, SheetConfiguration, TitleBlockDocument, Viewport, VisualizerDocument } from '@dac/schema';
export type { VisualizerDocument, DetailDocument, ProjectDocument, SheetConfiguration, TitleBlockDocument, Viewport };
import { resolveScaleMultiplier } from '@dac/json-solver';
import { renderDetail, renderSheet } from '@dac/renderer-svg';
import { getEditorForShape, ParametricEditor, DocumentEditor, ViewportEditor } from './editors';
import { ParametricEditorContext, PropertyEditorContext } from './editors/types';

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
  public engine: DacEngine;

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
  public layoutManager!: LayoutManager;
  public renderManager!: RenderManager;

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

    this.engine = new DacEngine();
    this.engine.setDocument(this.doc, this.viewportsMap, true);
    this.engine.addEventListener('document_changed', (e: any) => {
      this.doc = e.detail.document;
      if (e.detail.nestedDocs) {
        this.viewportsMap = e.detail.nestedDocs;
      }
      if (e.detail.isTransient) {
        this.renderSVG();
        this.canvasManager.updateZoomPan();
      } else {
        this.updateAndNotify();
        this.canvasManager.updateZoomPan();
      }
    });

    this.propertiesManager = new PropertiesManager(this);
    this.canvasManager = new CanvasManager(this);
    this.interactionManager = new InteractionManager(this);
    this.layoutManager = new LayoutManager(this);
    this.renderManager = new RenderManager(this);
    this.layoutManager.initLayout();
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
    if (this.isProject()) return; // Block inserting viewports in Project view mode
    try {
      this.engine.addViewport({ detail: detailName });
    } catch (e) {
      console.warn('Failed to insert viewport:', e);
    }
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
      if (this.doc.type === 'CAD::Project') {
        const ds = this.doc as ProjectDocument;
        this.engine.setActiveSheetId(ds.sheets[this.activeSheetIndex] as string);
      }
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

  
  
  public renderSVG() {
    this.renderManager.renderSVG();
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
    
    // Combine all nested docs for the engine
    const allNested = new Map<string, any>();
    if (this.viewportsMap) this.viewportsMap.forEach((v, k) => allNested.set(k, v));
    if (this.options?.sheetsMap) this.options.sheetsMap.forEach((v, k) => allNested.set(k, v));
    if (this.titleBlockMap) this.titleBlockMap.forEach((v, k) => allNested.set(k, v));
    
    this.engine.setDocument(this.doc, allNested, true);
    if (this.doc.type === 'CAD::Project') {
      const ds = this.doc as ProjectDocument;
      this.engine.setActiveSheetId(ds.sheets[this.activeSheetIndex] as string);
    }

    // Maintain selection state
    this.render();
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
