import { JsonBuilder } from '../JsonBuilder';
import { RectangleOptions, LineOptions, TextOptions, ImageOptions, CircleOptions } from '../types';

export class ShapeOperations {
  constructor(private engine: JsonBuilder) {}

  public addRectangle(options?: RectangleOptions): any {
    const shape = {
      type: 'CAD::Shape::Rectangle',
      componentId: this.engine.generateId('rect'),
      componentType: 'Rectangle',
      color: '#000000',
      strokeWidth: 1,
      strokeDasharray: 'none',
      fill: 'transparent',
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }

  public addLine(options?: LineOptions): any {
    const shape: any = {
      type: 'CAD::Shape::Line',
      componentId: this.engine.generateId('line'),
      componentType: 'Line',
      color: '#000000',
      strokeWidth: 1,
      strokeDasharray: 'none',
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }

  public addCircle(options?: CircleOptions): any {
    const shape: any = {
      type: 'CAD::Shape::Circle',
      componentId: this.engine.generateId('circle'),
      componentType: 'Circle',
      color: '#000000',
      strokeWidth: 1,
      strokeDasharray: 'none',
      ...options
    };
    return this.engine.addShapeToTarget(shape);
  }

  public addText(options?: TextOptions): any {
    const shape = {
      type: 'CAD::Annotation::Text',
      componentId: this.engine.generateId('text'),
      componentType: 'Text',
      color: '#000000',
      fontSize: 12,
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
