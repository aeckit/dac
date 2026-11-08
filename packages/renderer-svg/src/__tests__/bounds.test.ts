import { describe, it, expect } from 'vitest';
import { computeBoundingBox } from '../bounds';
import type { SolvedGroup } from '@aeckit/dac-json-solver';

describe('computeBoundingBox calculation', () => {
  it('computes exact bounding box for open and closed polylines', () => {
    const groups: SolvedGroup[] = [
      {
        componentId: 'poly-group',
        componentType: 'Polyline',
        shapes: [
          {
            type: 'CAD::Shape::Polyline',
            points: [
              [5, 10],
              [15, 25],
              [2, 8]
            ]
          }
        ]
      }
    ];

    const box = computeBoundingBox(groups);
    expect(box.hasGeometry).toBe(true);
    expect(box.minX).toBe(2);
    expect(box.maxX).toBe(15);
    expect(box.minY).toBe(8);
    expect(box.maxY).toBe(25);
    expect(box.width).toBe(13);
    expect(box.height).toBe(17);
  });

  it('computes bounding box with short type alias Polyline', () => {
    const groups: SolvedGroup[] = [
      {
        componentId: 'poly-short',
        componentType: 'Polyline',
        shapes: [
          {
            type: 'Polyline',
            points: [
              [-5, -10],
              [20, 30]
            ],
            closed: true
          }
        ]
      }
    ];

    const box = computeBoundingBox(groups);
    expect(box.hasGeometry).toBe(true);
    expect(box.minX).toBe(-5);
    expect(box.maxX).toBe(20);
    expect(box.minY).toBe(-10);
    expect(box.maxY).toBe(30);
    expect(box.width).toBe(25);
    expect(box.height).toBe(40);
  });

  it('aggregates bounding box across mixed primitives including polylines and rectangles', () => {
    const groups: SolvedGroup[] = [
      {
        componentId: 'g1',
        componentType: 'Rectangle',
        shapes: [
          {
            type: 'CAD::Shape::Rectangle',
            x: 0,
            y: 0,
            width: 10,
            height: 10
          }
        ]
      },
      {
        componentId: 'g2',
        componentType: 'Polyline',
        shapes: [
          {
            type: 'CAD::Shape::Polyline',
            points: [
              [15, 5],
              [30, 20]
            ]
          }
        ]
      }
    ];

    const box = computeBoundingBox(groups);
    expect(box.hasGeometry).toBe(true);
    expect(box.minX).toBe(0);
    expect(box.maxX).toBe(30);
    expect(box.minY).toBe(0);
    expect(box.maxY).toBe(20);
    expect(box.width).toBe(30);
    expect(box.height).toBe(20);
  });

  it('returns default fallback bounding box when no geometry is present', () => {
    const groups: SolvedGroup[] = [];
    const box = computeBoundingBox(groups);
    expect(box.hasGeometry).toBe(false);
    expect(box.minX).toBe(0);
    expect(box.maxX).toBe(10);
    expect(box.width).toBe(10);
  });
});
