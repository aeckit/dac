import { VisualizerDocument, RectangleOptions, LineOptions, TextOptions, ImageOptions, ViewportOptions } from './types';

export class DacEngine extends EventTarget {
  private document: VisualizerDocument | null = null;
  private activeSheetId: string | null = null;

  constructor() {
    super();
  }

  public setDocument(doc: VisualizerDocument) {
    // Deep clone to ensure the engine owns its state
    this.document = JSON.parse(JSON.stringify(doc));
    this.notifyChanged();
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
    
    if (this.document.type === 'Project') {
      if (!this.activeSheetId) throw new Error("No active sheet selected in project");
      const sheet = this.document.sheets?.find((s: any) => s.id === this.activeSheetId);
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
    const shape = {
      type: 'CAD::Viewport',
      componentId: this.generateId('vp'),
      componentType: 'Viewport',
      width: 20,
      height: 15,
      ...options
    };
    return this.addShapeToTarget(shape);
  }

  public updateComponent(id: string, properties: Partial<any>): void {
    const targetDoc = this.getTargetDocument();
    if (!targetDoc.geometry) return;
    
    const shapeIndex = targetDoc.geometry.findIndex((g: any) => g.componentId === id);
    if (shapeIndex === -1) throw new Error(`Component ${id} not found`);

    targetDoc.geometry[shapeIndex] = {
      ...targetDoc.geometry[shapeIndex],
      ...properties
    };

    this.notifyChanged();
  }

  public deleteComponent(id: string): void {
    const targetDoc = this.getTargetDocument();
    if (!targetDoc.geometry) return;

    targetDoc.geometry = targetDoc.geometry.filter((g: any) => g.componentId !== id);
    this.notifyChanged();
  }

  private notifyChanged() {
    this.dispatchEvent(new CustomEvent('document_changed', { 
      detail: { document: this.document } 
    }));
  }
}
