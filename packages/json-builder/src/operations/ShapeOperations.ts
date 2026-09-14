import { JsonBuilder } from '../JsonBuilder';
import { RectangleOptions, LineOptions, TextOptions, ImageOptions } from '../types';

export class ShapeOperations {
  constructor(private engine: JsonBuilder) {}

  public addRectangle(options?: RectangleOptions): any {
    const shape = {
      type: 'CAD::Shape::Rectangle',
      componentId: this.engine.generateId('rect'),
      componentType: 'Rectangle',
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }

  public addLine(options?: LineOptions): any {
    const shape: any = {
      type: 'CAD::Shape::Line',
      componentId: this.engine.generateId('line'),
      componentType: 'Line',
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }

  public addText(options?: TextOptions): any {
    const shape = {
      type: 'CAD::Annotation::Text',
      componentId: this.engine.generateId('text'),
      componentType: 'Text',
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }

  public addImage(options?: ImageOptions): any {
    const shape = {
      type: 'CAD::Shape::Image',
      componentId: this.engine.generateId('img'),
      componentType: 'Image',
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }
}
