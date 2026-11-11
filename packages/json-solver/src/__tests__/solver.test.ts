import { describe, it, expect } from 'vitest';
import {
  resolveScaleMultiplier,
  evaluateExpression,
  solveDetailDocument,
  resolveConstructParameters,
  resolveConstructGeometry,
  resolveDocumentParameters,
  DetailDocument,
  ConstructDocument
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
    expect(evaluateExpression('', params)).toBe('');
    expect(evaluateExpression('   ', params)).toBe('   ');
    expect(evaluateExpression('Hello', params)).toBe('Hello');
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

  it('solves a Dimension with empty textOverride without coercing to "0"', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Annotation::Dimension',
          componentId: 'dim1',
          x1: 0,
          y1: 0,
          x2: 4,
          y2: 0,
          offset: 20,
          prefix: '',
          suffix: '',
          textOverride: ''
        }
      ]
    };

    const layout = solveDetailDocument(doc);
    const solvedDim = layout.groups[0].shapes[0];
    expect(solvedDim.prefix).toBe('');
    expect(solvedDim.suffix).toBe('');
    expect(solvedDim.textOverride).toBe('');
  });

  it('solves a Dimension with secondaryText and textPosition', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Annotation::Dimension',
          componentId: 'dim2',
          x1: 0,
          y1: 0,
          x2: 4,
          y2: 0,
          offset: 20,
          secondaryText: '[100 mm]',
          textPosition: 'below'
        }
      ]
    };

    const layout = solveDetailDocument(doc);
    const solvedDim = layout.groups[0].shapes[0];
    expect(solvedDim.secondaryText).toBe('[100 mm]');
    expect(solvedDim.textPosition).toBe('below');
  });

  it('unpacks construct parameter option variables for defaults and overrides', () => {
    const constructDoc: ConstructDocument = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: {
        lumberSize: {
          type: 'string',
          default: '2x4',
          options: [
            { label: '2x4', value: '2x4', variables: { width: 3.5, height: 1.5 } },
            { label: '2x6', value: '2x6', variables: { width: 5.5, height: 1.5 } }
          ]
        }
      },
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'stud',
          x: 0,
          y: 0,
          width: '{parameters.lumberSize.width}',
          height: '{parameters.lumberSize.height}'
        }
      ]
    };

    // 1. Default resolution (2x4)
    const defaultParams = resolveConstructParameters(constructDoc);
    expect(defaultParams['lumberSize']).toBe('2x4');
    expect(defaultParams['lumberSize.width']).toBe(3.5);
    expect(defaultParams['lumberSize.height']).toBe(1.5);

    // 2. Overridden resolution (2x6)
    const overriddenParams = resolveConstructParameters(constructDoc, { lumberSize: '2x6' });
    expect(overriddenParams['lumberSize']).toBe('2x6');
    expect(overriddenParams['lumberSize.width']).toBe(5.5);
    expect(overriddenParams['lumberSize.height']).toBe(1.5);

    // 3. Geometry resolution with rotation and offset
    const refShape: any = {
      type: 'ConstructReference',
      componentId: 'ref_1',
      x: 10,
      y: 20,
      rotation: 90,
      parameterOverrides: { lumberSize: '2x6' }
    };
    const resolvedShapes: any[] = resolveConstructGeometry(refShape, constructDoc);
    expect(resolvedShapes.length).toBe(1);
    expect(resolvedShapes[0].componentId).toBe('ref_1_stud');
    expect(resolvedShapes[0].width).toBe(5.5);
    expect(resolvedShapes[0].height).toBe(1.5);
    expect(resolvedShapes[0].rotation).toBe(90);
  });

  it('solves construct references inside a DetailDocument without schema warnings', () => {
    const constructDoc: ConstructDocument = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: {
        lumberSize: {
          type: 'string',
          default: '2x4',
          options: [
            { label: '2x4', value: '2x4', variables: { width: 3.5, height: 1.5 } },
            { label: '2x6', value: '2x6', variables: { width: 5.5, height: 1.5 } }
          ]
        }
      },
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'body',
          x: 0,
          y: 0,
          width: '{parameters.lumberSize.width}',
          height: '{parameters.lumberSize.height}'
        }
      ]
    };

    const detailDoc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'ConstructReference',
          componentId: 'stud_instance',
          constructId: 'wood-stud',
          x: 5,
          y: 10,
          parameterOverrides: { lumberSize: '2x6' }
        }
      ]
    };

    const resolver = (id: string) => id === 'wood-stud' ? constructDoc : undefined;
    const layout = solveDetailDocument(detailDoc, 24, 18, resolver);

    expect(layout.groups.length).toBe(1);
    const group = layout.groups[0];
    expect(group.componentId).toBe('stud_instance');
    expect(group.warnings).toEqual([]); // Zero schema warnings!
    expect(group.shapes.length).toBe(1);
    expect(group.shapes[0].width).toBe(5.5);
    expect(group.shapes[0].height).toBe(1.5);
  });

  it('solves a DetailDocument with a parametric Polyline', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      parameters: {
        span: { type: 'number', default: 12 },
        rise: { type: 'number', default: 4 }
      },
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'truss',
          points: [
            [0, 0],
            ['{parameters.span} / 2', '{parameters.rise}'],
            ['{parameters.span}', 0]
          ],
          closed: true,
          fill: '#3b82f6'
        }
      ]
    };

    const layout = solveDetailDocument(doc);
    expect(layout.groups.length).toBe(1);
    const group = layout.groups[0];
    expect(group.componentId).toBe('truss');
    expect(group.warnings).toEqual([]);
    expect(group.shapes.length).toBe(1);

    const poly = group.shapes[0];
    expect(poly.type).toBe('CAD::Shape::Polyline');
    expect(poly.points).toEqual([
      [0, 0],
      [6, 4],
      [12, 0]
    ]);
    expect(poly.closed).toBe(true);
    expect(poly.fill).toBe('#3b82f6');
  });

  it('solves a DetailDocument with a parametric cornerRadius on Polyline', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      parameters: {
        rebarSize: {
          type: 'select',
          default: '#4',
          options: [
            { label: '#4', value: '#4', variables: { bendRadius: 1.5 } },
            { label: '#5', value: '#5', variables: { bendRadius: 2.0 } }
          ]
        }
      },
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'stirrup',
          points: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10]
          ],
          closed: true,
          cornerRadius: '{parameters.rebarSize.bendRadius}'
        }
      ]
    };

    const layout = solveDetailDocument(doc);
    expect(layout.groups.length).toBe(1);
    expect(layout.groups[0].shapes[0].cornerRadius).toBe(1.5);
  });

  it('resolves child polylines inside constructs with translation and rotation', () => {
    const constructDoc: ConstructDocument = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: {
        len: { type: 'number', default: 10 }
      },
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'path',
          points: [
            [0, 0],
            ['{parameters.len}', 0],
            ['{parameters.len}', 5]
          ],
          closed: false
        }
      ]
    };

    const refShape: any = {
      type: 'ConstructReference',
      componentId: 'inst',
      x: 5,
      y: 10,
      rotation: 90,
      parameterOverrides: { len: 10 }
    };

    const resolved = resolveConstructGeometry(refShape, constructDoc);
    expect(resolved.length).toBe(1);
    expect(resolved[0].componentId).toBe('inst_path');

    const pts = (resolved[0] as any).points;
    expect(pts).toHaveLength(3);
    // [0, 0] rotated 90 around (0,0) -> [0, 0] + (5, 10) = [5, 10]
    expect(pts[0][0]).toBeCloseTo(5);
    expect(pts[0][1]).toBeCloseTo(10);
    // [10, 0] rotated 90 around (0,0) -> [0, 10] + (5, 10) = [5, 20]
    expect(pts[1][0]).toBeCloseTo(5);
    expect(pts[1][1]).toBeCloseTo(20);
    // [10, 5] rotated 90 around (0,0) -> [-5, 10] + (5, 10) = [0, 20]
    expect(pts[2][0]).toBeCloseTo(0);
    expect(pts[2][1]).toBeCloseTo(20);
  });

  it('solves a DetailDocument with a hatched closed polyline without warnings', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Polyline',
          componentId: 'concrete_slab',
          points: [
            [0, 0],
            [24, 0],
            [24, 12],
            [0, 12]
          ],
          closed: true,
          hatch: 'Concrete'
        }
      ]
    };

    const layout = solveDetailDocument(doc);
    expect(layout.groups).toHaveLength(1);
    const group = layout.groups[0];
    expect(group.componentId).toBe('concrete_slab');
    expect(group.warnings).toEqual([]);
    expect(group.shapes).toHaveLength(1);
    const shape = group.shapes[0];
    expect(shape.closed).toBe(true);
    expect(shape.hatch).toBe('Concrete');
  });

  it('evaluates parametric x, y, and rotation on ConstructReference without warnings while still flagging unrecognized width/height', () => {
    const constructDoc: ConstructDocument = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: {
        length: { type: 'number', default: 6 }
      },
      geometry: [
        {
          type: 'CAD::Shape::Line',
          componentId: 'seg',
          x1: '-{parameters.length} / 2',
          y1: 0,
          x2: '{parameters.length} / 2',
          y2: 0
        }
      ]
    };

    const validDetail: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      parameters: {
        posX: { type: 'number', default: 4 },
        posY: { type: 'number', default: 8 },
        angle: { type: 'number', default: 90 }
      },
      geometry: [
        {
          type: 'ConstructReference',
          componentId: 'brk_1',
          constructId: 'breakline',
          x: '{parameters.posX}',
          y: '{parameters.posY}',
          rotation: '{parameters.angle}',
          parameterOverrides: { length: 10 }
        }
      ]
    };

    const resolver = (id: string) => id === 'breakline' ? constructDoc : undefined;
    const validLayout = solveDetailDocument(validDetail, 24, 18, resolver);
    expect(validLayout.groups).toHaveLength(1);
    expect(validLayout.groups[0].warnings).toEqual([]);
    expect(validLayout.groups[0].shapes[0].x1).toBeCloseTo(4);
    expect(validLayout.groups[0].shapes[0].y1).toBeCloseTo(3);
    expect(validLayout.groups[0].shapes[0].x2).toBeCloseTo(4);
    expect(validLayout.groups[0].shapes[0].y2).toBeCloseTo(13);

    const invalidDetail: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'ConstructReference',
          componentId: 'brk_bad',
          constructId: 'breakline',
          x: 0,
          y: 0,
          width: 10,
          height: 5
        } as any
      ]
    };
    const invalidLayout = solveDetailDocument(invalidDetail, 24, 18, resolver);
    expect(invalidLayout.groups[0].warnings?.length).toBeGreaterThan(0);
  });
});
