import { VisualizerDocument, RectangleOptions, LineOptions, TextOptions, ImageOptions, ViewportOptions } from './types';

export class DacEngine extends EventTarget {
  private document: any = null;
  private nestedDocs: Map<string, any> = new Map();
  private activeSheetId: string | null = null;

  constructor() {
    super();
  }

  public setDocument(doc: VisualizerDocument, nestedDocs?: Map<string, any>, suppressEvent: boolean = false) {
    // Deep clone to ensure the engine owns its state
    this.document = JSON.parse(JSON.stringify(doc));
    if (nestedDocs) {
      this.nestedDocs = new Map();
      nestedDocs.forEach((val, key) => {
        this.nestedDocs.set(key, JSON.parse(JSON.stringify(val)));
      });
    }
    if (!suppressEvent) {
      this.notifyChanged();
    }
  }

  public getDocument(): VisualizerDocument | null {
    return this.document;
  }

  public setActiveSheetId(sheetId: string | null) {
    this.activeSheetId = sheetId;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}`;
  }

  private getTargetDocument(): any {
    if (!this.document) throw new Error("No document loaded");
    
    if (this.document.type === 'CAD::Project') {
      if (!this.activeSheetId) throw new Error("No active sheet selected in project");
      
      const sheetRef = this.document.sheets?.[this.activeSheetId] || this.document.sheets?.find((s: any) => s.id === this.activeSheetId) || this.activeSheetId;
      const sheet = this.nestedDocs.get(sheetRef as string) || (typeof sheetRef === 'object' ? sheetRef : null);
      
      if (!sheet) throw new Error("Active sheet not found");
      return sheet;
    }
    
    if (this.document.type !== 'CAD::Detail' && this.document.type !== 'CAD::TitleBlock' && this.document.type !== 'CAD::SheetConfiguration') {
      throw new Error(`Cannot add shape to document of type ${this.document.type}`);
    }

    return this.document;
  }

  private addShapeToTarget(shape: any): any {
    const targetDoc = this.getTargetDocument();
    if (!targetDoc.geometry) {
      targetDoc.geometry = [];
    }
    
    // Default offset based on array length if no explicit x/y provided
    const defaultOffset = targetDoc.geometry.length * 0.5;
    if (shape.x === undefined) shape.x = defaultOffset;
    if (shape.y === undefined) shape.y = defaultOffset;
    
    targetDoc.geometry.push(shape);
    this.notifyChanged();
    return shape;
  }

  public addRectangle(options?: RectangleOptions): any {
    const shape = {
      type: 'CAD::Shape::Rectangle',
      componentId: this.generateId('rect'),
      componentType: 'Rectangle',
      width: 12,
      height: 12,
      fill: 'gray',
      ...options
    };
    return this.addShapeToTarget(shape);
  }

  public addLine(options?: LineOptions): any {
    const shape = {
      type: 'CAD::Shape::Line',
      componentId: this.generateId('line'),
      componentType: 'Line',
      x2: (options?.x || 0) + 10,
      y2: (options?.y || 0) + 10,
      ...options
    };
    return this.addShapeToTarget(shape);
  }

  public addText(options?: TextOptions): any {
    const shape = {
      type: 'CAD::Annotation::Text',
      componentId: this.generateId('text'),
      componentType: 'Text',
      text: 'New Text',
      fontSize: 4,
      ...options
    };
    return this.addShapeToTarget(shape);
  }

  public addImage(options?: ImageOptions): any {
    const shape = {
      type: 'CAD::Shape::Image',
      componentId: this.generateId('img'),
      componentType: 'Image',
      width: 20,
      height: 20,
      ...options
    };
    return this.addShapeToTarget(shape);
  }

  public addViewport(options?: ViewportOptions): any {
    const targetDoc = this.getTargetDocument();
    
    // Enforce domain rule: viewports can only exist on sheets.
    // If it's not a sheet (e.g. it's a CAD::Detail view or the raw project), reject it.
    if (targetDoc.type !== 'CAD::SheetConfiguration' && targetDoc.type !== 'SheetConfiguration') {
      throw new Error(`Viewports can only be added to Sheets. Current target is ${targetDoc.type}`);
    }

    if (!targetDoc.viewports) {
      targetDoc.viewports = [];
    }
    const defaultOffset = 2 + (targetDoc.viewports.length * 2);

    const shape = {
      type: 'CAD::Viewport',
      componentId: this.generateId('viewport'),
      componentType: 'Viewport',
      detail: '',
      x: defaultOffset,
      y: defaultOffset,
      scale: '1:1',
      width: 6,
      height: 6,
      ...options
    };
    
    targetDoc.viewports.push(shape);
    this.notifyChanged();
    return shape;
  }

  public updateComponent(id: string, properties: Partial<any>, isTransient: boolean = false): void {
    const targetDoc = this.getTargetDocument();
    
    if (targetDoc.geometry) {
      let autoIndex = 0;
      const shapeIndex = targetDoc.geometry.findIndex((g: any) => {
        const sid = g.componentId || 'shape_' + autoIndex++;
        return sid === id;
      });
      if (shapeIndex !== -1) {
        targetDoc.geometry[shapeIndex] = { ...targetDoc.geometry[shapeIndex], ...properties };
        this.notifyChanged(isTransient);
        return;
      }
    }
    
    if (targetDoc.viewports) {
      let autoIndex = 0;
      const vpIndex = targetDoc.viewports.findIndex((v: any) => {
        const sid = v.componentId || 'vp_' + autoIndex++;
        return sid === id;
      });
      if (vpIndex !== -1) {
        targetDoc.viewports[vpIndex] = { ...targetDoc.viewports[vpIndex], ...properties };
        this.notifyChanged(isTransient);
        return;
      }
    }

    // Search nested docs
    for (const [key, nestedDoc] of this.nestedDocs.entries()) {
      if (nestedDoc.geometry) {
        let autoIndex = 0;
        const shapeIndex = nestedDoc.geometry.findIndex((g: any) => {
          const sid = g.componentId || 'shape_' + autoIndex++;
          return sid === id;
        });
        if (shapeIndex !== -1) {
           nestedDoc.geometry[shapeIndex] = { ...nestedDoc.geometry[shapeIndex], ...properties };
           this.notifyChanged(isTransient);
           return;
        }
      }
    }

    throw new Error(`Component ${id} not found`);
  }

  public deleteComponent(id: string): void {
    const targetDoc = this.getTargetDocument();
    
    if (targetDoc.geometry) {
      let autoIndex = 0;
      targetDoc.geometry = targetDoc.geometry.filter((g: any) => {
        const sid = g.componentId || 'shape_' + autoIndex++;
        return sid !== id;
      });
    }
    if (targetDoc.viewports) {
      let autoIndex = 0;
      targetDoc.viewports = targetDoc.viewports.filter((v: any) => {
        const sid = v.componentId || 'vp_' + autoIndex++;
        return sid !== id;
      });
    }

    // Search nested docs
    for (const [key, nestedDoc] of this.nestedDocs.entries()) {
      if (nestedDoc.geometry) {
        let autoIndex = 0;
        nestedDoc.geometry = nestedDoc.geometry.filter((g: any) => {
          const sid = g.componentId || 'shape_' + autoIndex++;
          return sid !== id;
        });
      }
    }
    
    this.notifyChanged();
  }

  private notifyChanged(isTransient: boolean = false) {
    this.dispatchEvent(new CustomEvent('document_changed', { 
      detail: { 
        document: this.document, 
        nestedDocs: this.nestedDocs.size > 0 ? this.nestedDocs : undefined,
        isTransient 
      } 
    }));
  }
}
