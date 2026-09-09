import { JsonBuilder } from '../JsonBuilder';
import { ViewportOptions } from '../types';

export class ViewportOperations {
  constructor(private engine: JsonBuilder) {}

  public addViewport(options?: ViewportOptions): any {
    const targetDoc = this.engine.getTargetDocument();
    
    // Enforce domain rule: viewports can only exist on sheets.
    if (targetDoc.type !== 'CAD::SheetConfiguration' && targetDoc.type !== 'SheetConfiguration') {
      throw new Error(`Viewports can only be added to Sheets. Current target is ${targetDoc.type}`);
    }

    if (!targetDoc.viewports) {
      targetDoc.viewports = [];
    }
    const defaultOffset = 2 + (targetDoc.viewports.length * 2);

    const shape = {
      type: 'CAD::Viewport',
      componentId: this.engine.generateId('viewport'),
      componentType: 'Viewport',
      detail: '',
      detailNumber: String(targetDoc.viewports.length + 1),
      x: defaultOffset,
      y: defaultOffset,
      scale: '1:1',
      width: 10,
      height: 8,
      ...options
    };
    
    targetDoc.viewports.push(shape);
    this.engine.notifyChanged();
    return shape;
  }
}
