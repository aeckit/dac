import { describe, it, expect } from 'vitest';
import {
  resolveScaleMultiplier,
  evaluateExpression,
  solveDetailDocument,
  DetailDocument
} from '../index';

describe('@aeckit/dac-json-solver parametric math and layout engine', () => {
  it('resolves standard architectural scale strings to multipliers', () => {
    expect(resolveScaleMultiplier('1:1')).toBe(1.0);
    expect(resolveScaleMultiplier('1/4" = 1\'-0"')).toBe(0.25 / 12);
    expect(resolveScaleMultiplier('1:1.5')).toBe(1 / 1.5);
  });

  it('evaluates parametric expressions with variables', () => {
    const params = { width: 10, thickness: 2 };
    expect(evaluateExpression('{parameters.width} * 2', params)).toBe(20);
    expect(evaluateExpression('{parameters.width} + {parameters.thickness}', params)).toBe(12);
  });

  it('solves a dynamic DetailDocument into static IR groups with evaluated numbers', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      parameters: {
        beamWidth: { type: 'number', default: 16 }
      },
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'beam',
          x: '2',
          y: '4',
          width: '{parameters.beamWidth} * 2',
          height: '8'
        }
      ]
    };

    const layout = solveDetailDocument(doc);
    expect(layout.scaleMultiplier).toBe(1.0);
    expect(layout.groups.length).toBe(1);

    const beamGroup = layout.groups[0];
    expect(beamGroup.componentId).toBe('beam');
    expect(beamGroup.shapes.length).toBe(1);

    const solvedBeam = beamGroup.shapes[0];
    expect(solvedBeam.x).toBe(2);
    expect(solvedBeam.y).toBe(4);
    expect(solvedBeam.width).toBe(32); // 16 * 2 = 32
    expect(solvedBeam.height).toBe(8);
  });
});
