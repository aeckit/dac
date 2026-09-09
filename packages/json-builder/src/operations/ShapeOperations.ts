import { JsonBuilder } from '../JsonBuilder';
import { RectangleOptions, LineOptions, TextOptions, ImageOptions } from '../types';

export class ShapeOperations {
  constructor(private engine: JsonBuilder) {}

  public addRectangle(options?: RectangleOptions): any {
    const shape = {
      type: 'CAD::Shape::Rectangle',
      componentId: this.engine.generateId('rect'),
      componentType: 'Rectangle',
      width: 12,
      height: 12,
      fill: 'gray',
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }

  public addLine(options?: LineOptions): any {
    const shape: any = {
      type: 'CAD::Shape::Line',
      componentId: this.engine.generateId('line'),
      componentType: 'Line',
      x1: options?.x || 0,
      y1: options?.y || 0,
      x2: (options?.x || 0) + 10,
      y2: (options?.y || 0) + 10,
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }

  public addText(options?: TextOptions): any {
    const shape = {
      type: 'CAD::Annotation::Text',
      componentId: this.engine.generateId('text'),
      componentType: 'Text',
      text: 'New Text',
      fontSize: 4,
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }

  public addImage(options?: ImageOptions): any {
    const shape = {
      type: 'CAD::Shape::Image',
      componentId: this.engine.generateId('img'),
      componentType: 'Image',
      width: 20,
      height: 20,
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }
}
