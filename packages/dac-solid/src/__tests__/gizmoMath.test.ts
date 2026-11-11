import { describe, it, expect } from 'vitest';
import type { ConstructDocument } from '@aeckit/dac-json-solver';
import {
  computeConstructLengthEndpointSvg,
  computeNextConstructLength,
  inferConstructLengthAnchoring,
  isExpressionString,
  isNumericParameter,
  toFiniteNumber,
} from '../utils/gizmoMath';

describe('gizmoMath unit tests', () => {
  it('evaluates numbers and parametric expressions safely without returning NaN', () => {
    const params = { offset: 4, span: 10 };
    expect(toFiniteNumber(5, params)).toBe(5);
    expect(toFiniteNumber('{parameters.offset} + 2', params)).toBe(6);
    expect(toFiniteNumber(undefined, params, 12)).toBe(12);
    expect(toFiniteNumber(null, params, 3)).toBe(3);
    expect(toFiniteNumber(NaN, params, 7)).toBe(7);
    expect(toFiniteNumber('not-a-number', params, 9)).toBe(9);
    expect(isExpressionString('{parameters.span}')).toBe(true);
    expect(isExpressionString(10)).toBe(false);
  });

  it('identifies numeric parameters accurately', () => {
    expect(isNumericParameter({ type: 'number', default: 6 })).toBe(true);
    expect(isNumericParameter({ type: 'select', default: 6 })).toBe(true);
    expect(isNumericParameter({ type: 'string', default: '2x4' })).toBe(false);
    expect(isNumericParameter(undefined)).toBe(false);
  });

  it('infers centered vs zero-anchored construct length geometry', () => {
    const centeredBreakline: ConstructDocument = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: {
        length: { type: 'number', default: 6 },
      },
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'break-zig',
          points: [
            ['-{parameters.length} / 2', 0],
            [-0.25, 0],
            [0, 0.3],
            [0.25, -0.3],
            ['{parameters.length} / 2', 0],
          ],
          closed: false,
        },
      ],
    };

    const centered = inferConstructLengthAnchoring(centeredBreakline, 6);
    expect(centered.isCentered).toBe(true);
    expect(centered.localEndX).toBe(3);
    expect(centered.localEndY).toBeCloseTo(0);
    expect(centered.scaleFactor).toBe(2);

    const zeroAnchored: ConstructDocument = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: {
        length: { type: 'number', default: 8 },
      },
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'beam',
          x: 0,
          y: 0,
          width: '{parameters.length}',
          height: 2,
        },
      ],
    };

    const anchored = inferConstructLengthAnchoring(zeroAnchored, 8);
    expect(anchored.isCentered).toBe(false);
    expect(anchored.localEndX).toBe(8);
    expect(anchored.localEndY).toBeCloseTo(1);
    expect(anchored.scaleFactor).toBe(1);
  });

  it('computes rotated SVG endpoint coordinates for construct length handle', () => {
    // 0 deg rotation: local (3, 0) from (5, 4) -> world (8, 4) -> svg (8, 14)
    expect(
      computeConstructLengthEndpointSvg({
        refX: 5,
        refY: 4,
        rotDeg: 0,
        localEndX: 3,
        localEndY: 0,
        canvasHeight: 18,
      })
    ).toEqual({ svgX: 8, svgY: 14 });

    // 90 deg CCW rotation: local (3, 0) from (5, 4) -> world (5, 7) -> svg (5, 11)
    const rot90 = computeConstructLengthEndpointSvg({
      refX: 5,
      refY: 4,
      rotDeg: 90,
      localEndX: 3,
      localEndY: 0,
      canvasHeight: 18,
    });
    expect(rot90.svgX).toBeCloseTo(5);
    expect(rot90.svgY).toBeCloseTo(11);
  });

  it('projects drag deltas onto rotated axis, applies scale factor, clamps, and snaps to step', () => {
    // Centered (scaleFactor = 2) at 0 deg: dx=+1.5 -> +3 length
    expect(
      computeNextConstructLength({
        initialLength: 6,
        dx: 1.5,
        dy: 0,
        rotDeg: 0,
        scaleFactor: 2,
      })
    ).toBe(9);

    // Rotated 90 deg (local +X points UP in Cartesian, which is -Y in SVG): dy=-2 -> +2 proj
    expect(
      computeNextConstructLength({
        initialLength: 6,
        dx: 0,
        dy: -2,
        rotDeg: 90,
        scaleFactor: 2,
      })
    ).toBe(10);

    // Clamping to min/max and snapping to step
    expect(
      computeNextConstructLength({
        initialLength: 6,
        dx: -10,
        dy: 0,
        rotDeg: 0,
        scaleFactor: 1,
        min: 2,
        max: 12,
        step: 0.25,
      })
    ).toBe(2);

    expect(
      computeNextConstructLength({
        initialLength: 6,
        dx: 2.38,
        dy: 0,
        rotDeg: 0,
        scaleFactor: 1,
        min: 1,
        max: 12,
        step: 0.25,
      })
    ).toBe(8.5);
  });
});
