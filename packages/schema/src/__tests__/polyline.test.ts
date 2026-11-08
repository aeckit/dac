import { describe, it, expect } from 'vitest';
import { PolylineSchema, GeometryPrimitiveSchema, validateDetailDocument } from '../index';

describe('PolylineSchema validation', () => {
  it('validates a valid open polyline with numeric coordinates', () => {
    const raw = {
      type: 'CAD::Shape::Polyline',
      componentId: 'poly-1',
      points: [
        [0, 0],
        [10, 5],
        [20, 0]
      ],
      color: '#ff0000',
      strokeWidth: 2,
      strokeDasharray: '4 2',
      rotation: 45
    };

    const parsed = PolylineSchema.parse(raw);
    expect(parsed.type).toBe('CAD::Shape::Polyline');
    expect(parsed.points).toHaveLength(3);
    expect(Boolean(parsed.closed)).toBe(false);
    expect(parsed.color).toBe('#ff0000');
    expect(parsed.rotation).toBe(45);
  });

  it('validates a valid closed polyline with fill and short type alias', () => {
    const raw = {
      type: 'Polyline',
      componentId: 'poly-closed',
      points: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10]
      ],
      closed: true,
      fill: '#00ff00'
    };

    const parsed = PolylineSchema.parse(raw);
    expect(parsed.type).toBe('Polyline');
    expect(parsed.closed).toBe(true);
    expect(parsed.fill).toBe('#00ff00');
  });

  it('validates expression-based coordinates in points', () => {
    const raw = {
      type: 'CAD::Shape::Polyline',
      points: [
        [0, '{parameters.baseY}'],
        ['{parameters.width}', 10],
        ['{parameters.width} * 2', '{parameters.height}']
      ]
    };

    const parsed = PolylineSchema.parse(raw);
    expect(parsed.points[0]).toEqual([0, '{parameters.baseY}']);
    expect(parsed.points[1]).toEqual(['{parameters.width}', 10]);
    expect(parsed.points[2]).toEqual(['{parameters.width} * 2', '{parameters.height}']);
  });

  it('rejects point lists with fewer than 2 points', () => {
    const emptyPoints = {
      type: 'CAD::Shape::Polyline',
      points: []
    };
    expect(() => PolylineSchema.parse(emptyPoints)).toThrow();

    const singlePoint = {
      type: 'CAD::Shape::Polyline',
      points: [[0, 0]]
    };
    expect(() => PolylineSchema.parse(singlePoint)).toThrow();
  });

  it('rejects invalid point coordinate tuples', () => {
    const invalidTuple = {
      type: 'CAD::Shape::Polyline',
      points: [
        [0, 0],
        [10] // missing Y
      ]
    };
    expect(() => PolylineSchema.parse(invalidTuple)).toThrow();

    const nonNumericOrString = {
      type: 'CAD::Shape::Polyline',
      points: [
        [0, 0],
        [10, true as any]
      ]
    };
    expect(() => PolylineSchema.parse(nonNumericOrString)).toThrow();
  });

  it('validates polyline inside DetailDocument through validateDetailDocument', () => {
    const doc = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'poly-doc',
          points: [
            [0, 0],
            [5, 5]
          ]
        }
      ]
    };

    const validated = validateDetailDocument(doc);
    expect(validated.geometry).toHaveLength(1);
    expect(validated.geometry[0].type).toBe('CAD::Shape::Polyline');
  });
});
