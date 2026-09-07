import { DacEngine } from '../DacEngine';
import { ViewportOptions } from '../types';

export class ViewportOperations {
  constructor(private engine: DacEngine) {}

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
      x: defaultOffset,
      y: defaultOffset,
      scale: '1:1',
      width: 6,
      height: 6,
      ...options
    };
    
    targetDoc.viewports.push(shape);
    this.engine.notifyChanged();
    return shape;
  }
}
