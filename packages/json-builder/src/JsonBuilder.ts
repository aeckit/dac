import { VisualizerDocument, RectangleOptions, LineOptions, TextOptions, ImageOptions, ViewportOptions } from './types';
import { ShapeOperations } from './operations/ShapeOperations';
import { ViewportOperations } from './operations/ViewportOperations';
import { ComponentOperations } from './operations/ComponentOperations';
import { GeometryPrimitiveSchema } from '@aeckit/dac-schema';

export class JsonBuilder extends EventTarget {
  private document: any = null;
  private nestedDocs: Map<string, any> = new Map();
  private activeSheetId: string | null = null;

  public readonly shapes: ShapeOperations;
  public readonly viewports: ViewportOperations;
  public readonly components: ComponentOperations;

  constructor() {
    super();
    this.shapes = new ShapeOperations(this);
    this.viewports = new ViewportOperations(this);
    this.components = new ComponentOperations(this);
  }

  public setDocument(doc: VisualizerDocument, nestedDocs?: Map<string, any>, suppressEvent: boolean = false) {
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

  public getNestedDocs(): Map<string, any> {
    return this.nestedDocs;
  }

  public setActiveSheetId(sheetId: string | null) {
    this.activeSheetId = sheetId;
  }

  public generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}`;
  }

  public getTargetDocument(): any {
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

  public addShapeToTarget(shape: any): any {
    const targetDoc = this.getTargetDocument();
    if (!targetDoc.geometry) {
      targetDoc.geometry = [];
    }
    
    const defaultOffset = targetDoc.geometry.length * 0.5;
    const isLine = shape.type === 'Line' || shape.type === 'CAD::Shape::Line';
    if (!isLine) {
      if (shape.x === undefined) shape.x = defaultOffset;
      if (shape.y === undefined) shape.y = defaultOffset;
    }
    
    // Parse through schema to strip invalid fields and inject defaults
    const parsedShape = GeometryPrimitiveSchema.parse(shape);
    
    targetDoc.geometry.push(parsedShape);
    this.notifyChanged();
    return parsedShape;
  }

  // Delegated backwards-compatible aliases
  public addRectangle(options?: RectangleOptions): any { return this.shapes.addRectangle(options); }
  public addLine(options?: LineOptions): any { return this.shapes.addLine(options); }
  public addCircle(options?: any): any { return this.shapes.addCircle(options); }
  public addText(options?: TextOptions): any { return this.shapes.addText(options); }
  public addImage(options?: ImageOptions): any { return this.shapes.addImage(options); }
  public addViewport(options?: ViewportOptions): any { return this.viewports.addViewport(options); }
  public updateComponent(id: string, properties: Partial<any>, isTransient = false): void { return this.components.updateComponent(id, properties, isTransient); }
  public deleteComponent(id: string): void { return this.components.deleteComponent(id); }
  public replaceComponentWithShapes(id: string, newShapes: any[]): void { return this.components.replaceComponentWithShapes(id, newShapes); }

  public mutateDocument(mutator: (doc: any) => void): void {
    if (this.document) {
      mutator(this.document);
      this.notifyChanged();
    }
  }

  public mutateActiveSheet(mutator: (sheet: any) => void): void {
    try {
      const sheet = this.getTargetDocument();
      if (sheet) {
        mutator(sheet);
        this.notifyChanged();
      }
    } catch (e) {
      console.warn('mutateActiveSheet failed:', e);
    }
  }

  public notifyChanged(isTransient: boolean = false) {
    this.dispatchEvent(new CustomEvent('document_changed', { 
      detail: { 
        document: this.document, 
        nestedDocs: this.nestedDocs.size > 0 ? this.nestedDocs : undefined,
        isTransient 
      } 
    }));
  }
}

// Alias for seamless backward compatibility during Strangler Fig migration
export const DacEngine = JsonBuilder;
