import { describe, it, expect } from 'vitest';
import {
  renderSolvedDetail,
  renderSolvedGroups,
  drawLine,
  drawRectangle,
  drawCircle,
  drawLeader,
  drawDimension,
  drawPolyline,
  getDefs
} from '../index';
import type { SolvedDetailLayout, SolvedGroup } from '@aeckit/dac-json-solver';

describe('@aeckit/dac-renderer-svg pure SVG generation engine', () => {
  it('draws a pure SVG line without expression evaluation', () => {
    const shape = {
      type: 'CAD::Shape::Line',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 18,
      color: '#ffffff',
      strokeWidth: 2
    };

    const svg = drawLine(shape, 1.0, 18);
    expect(svg).toContain('<line x1="0" y1="18" x2="10" y2="0"');
  });

  it('draws a pure SVG rectangle', () => {
    const shape = {
      type: 'CAD::Shape::Rectangle',
      x: 2,
      y: 4,
      width: 10,
      height: 6,
      fill: 'red'
    };

    const svg = drawRectangle(shape, 1.0, 18);
    // Inverted Y: 18 - (4 + 6) = 8
    expect(svg).toContain('<rect x="2" y="8" width="10" height="6"');
    expect(svg).toContain('fill="red"');
  });

  it('renders a full SolvedDetailLayout into SVG string', () => {
    const layout: SolvedDetailLayout = {
      scaleMultiplier: 1.0,
      canvasWidth: 24,
      canvasHeight: 18,
      groups: [
        {
          componentId: 'box-1',
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
        }
      ]
    };

    const svg = renderSolvedDetail(layout);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('data-component-id="box-1"');
    expect(svg).toContain('viewBox="0 0 24 18"');
  });

  it('draws a leader annotation with hit area, marker, shoulder, and text', () => {
    const leaderShape = {
      type: 'CAD::Annotation::Leader',
      x: 2,
      y: 2,
      dx: 4,
      dy: 3,
      text: 'Test Note'
    };

    const svg = drawLeader(leaderShape, 1.0, 18);
    expect(svg).toContain('class="cad-hit-area"');
    expect(svg).toContain('class="leader-line"');
    expect(svg).not.toContain('dimension-line');
    expect(svg).toContain('stroke-dasharray="none"');
    expect(svg).toContain('marker-start="url(#arrow)"');
    // Default shoulder length 0.25: anchor (2, 16) -> elbow (6, 13) -> shoulder (6.25, 13)
    expect(svg).toContain('points="2,16 6,13 6.25,13"');
    expect(svg).toContain('text-anchor="start"');
    expect(svg).toContain('Test Note');

    // Negative dx should extend shoulder to the left and set text-anchor="end"
    const leftLeader = {
      type: 'CAD::Annotation::Leader',
      x: 10,
      y: 5,
      dx: -4,
      dy: 2,
      strokeDasharray: '4 2',
      text: 'Left Note'
    };
    const leftSvg = drawLeader(leftLeader, 1.0, 18);
    // anchor (10, 13) -> elbow (6, 11) -> shoulder (5.75, 11)
    expect(leftSvg).toContain('points="10,13 6,11 5.75,11"');
    expect(leftSvg).toContain('stroke-dasharray="4 2"');
    expect(leftSvg).toContain('text-anchor="end"');
  });

  it('draws a dimension annotation with hit area, extension lines, and main line', () => {
    const dimShape = {
      type: 'CAD::Annotation::Dimension',
      x1: 2,
      y1: 2,
      x2: 6,
      y2: 2,
      offset: 20,
      text: '4\'-0"'
    };

    const svg = drawDimension(dimShape, 1.0, 18);
    expect(svg).toContain('class="cad-hit-area"');
    expect(svg).toContain('class="dimension-main-line"');
    expect(svg).toContain('class="dimension-line"');
    expect(svg).toContain('data-x1="2"');
    expect(svg).toContain('data-y1="16"');
    expect(svg).toContain('data-x2="6"');
    expect(svg).toContain('data-y2="16"');
    expect(svg).toContain('data-scale="1"');
    expect(svg).toContain('4\'-0"');
  });

  it('renders default calculated dimension, and supports prefix, suffix, and textOverride', () => {
    // 1. Default calculated measurement without text
    const autoDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 5.5,
      y2: 0,
      offset: 20
    };
    const autoSvg = drawDimension(autoDim, 1.0, 18);
    expect(autoSvg).toContain('5.5"');

    // 2. Prefix and suffix retaining actual measurement
    const taggedDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 5.5,
      y2: 0,
      offset: 20,
      prefix: 'TYP. ',
      suffix: ' (2x6)'
    };
    const taggedSvg = drawDimension(taggedDim, 1.0, 18);
    expect(taggedSvg).toContain('TYP. 5.5" (2x6)');

    // 3. Text override replaces measured text while preserving prefix/suffix
    const overrideDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 5.5,
      y2: 0,
      offset: 20,
      prefix: 'MIN. ',
      suffix: ' CLR.',
      textOverride: 'V.I.F.'
    };
    const overrideSvg = drawDimension(overrideDim, 1.0, 18);
    expect(overrideSvg).toContain('MIN. V.I.F. CLR.');

    // 4. Empty textOverride, prefix, and suffix should never produce "000"
    const emptyFieldsDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 4,
      y2: 0,
      offset: 20,
      prefix: '',
      suffix: '',
      textOverride: ''
    };
    const emptyFieldsSvg = drawDimension(emptyFieldsDim, 1.0, 18);
    expect(emptyFieldsSvg).toContain('>4"<');
    expect(emptyFieldsSvg).not.toContain('>000');
    expect(emptyFieldsSvg).not.toContain('000"');
  });

  it('aligns dimension text in line with primary dimension line and enforces bottom-to-top for vertical dimensions', () => {
    // Horizontal left-to-right
    const horizDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 0,
      offset: 20
    };
    const horizSvg = drawDimension(horizDim, 1.0, 18);
    expect(horizSvg).toContain('rotate(0)');

    // Horizontal right-to-left should be normalized to rotate(0)
    const horizRevDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 10,
      y1: 0,
      x2: 0,
      y2: 0,
      offset: 20
    };
    const horizRevSvg = drawDimension(horizRevDim, 1.0, 18);
    expect(horizRevSvg).toContain('rotate(0)');

    // Vertical bottom-to-top (Cartesian y1=0, y2=10)
    const vertDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 10,
      offset: 20
    };
    const vertSvg = drawDimension(vertDim, 1.0, 18);
    expect(vertSvg).toContain('rotate(-90)');

    // Vertical top-to-bottom (Cartesian y1=10, y2=0) should still read bottom-to-top
    const vertRevDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 10,
      x2: 0,
      y2: 0,
      offset: 20
    };
    const vertRevSvg = drawDimension(vertRevDim, 1.0, 18);
    expect(vertRevSvg).toContain('rotate(-90)');
  });

  it('positions primary text above or below and places secondaryText on the opposite side', () => {
    // Default textPosition: 'above'
    const defaultDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 6,
      y2: 0,
      offset: 20,
      secondaryText: '[150 mm]'
    };
    const defaultSvg = drawDimension(defaultDim, 1.0, 18);
    // Primary text is above: dominant-baseline="alphabetic", negative y
    const primaryMatch = defaultSvg.match(/<text x="0" y="-[0-9.]+" font-size="([0-9.]+)"[^>]*dominant-baseline="alphabetic"[^>]*>6"<\/text>/);
    expect(primaryMatch).not.toBeNull();
    // Secondary text is below: dominant-baseline="hanging", positive y, and matches primary font size
    const secondaryMatch = defaultSvg.match(/<text x="0" y="[0-9.]+" font-size="([0-9.]+)"[^>]*dominant-baseline="hanging"[^>]*class="dim-text dim-secondary-text">\[150 mm\]<\/text>/);
    expect(secondaryMatch).not.toBeNull();
    expect(secondaryMatch![1]).toBe(primaryMatch![1]);

    // Explicit textPosition: 'below'
    const belowDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 6,
      y2: 0,
      offset: 20,
      textPosition: 'below' as const,
      secondaryText: 'VERIFY'
    };
    const belowSvg = drawDimension(belowDim, 1.0, 18);
    // Primary text is below: dominant-baseline="hanging", positive y
    expect(belowSvg).toMatch(/<text x="0" y="[0-9.]+" font-size="[0-9.]+"[^>]*dominant-baseline="hanging"[^>]*>6"<\/text>/);
    // Secondary text is above: dominant-baseline="alphabetic", negative y
    expect(belowSvg).toMatch(/<text x="0" y="-[0-9.]+" font-size="[0-9.]+"[^>]*dominant-baseline="alphabetic"[^>]*class="dim-text dim-secondary-text">VERIFY<\/text>/);
  });

  it('supports custom fontSize (numbers in pt and fractional strings like "1/8")', () => {
    // 14pt font size
    const customDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 6,
      y2: 0,
      offset: 20,
      fontSize: 14
    };
    const customSvg = drawDimension(customDim, 1.0, 18);
    // 14 / 72 = ~0.19444
    expect(customSvg).toContain(`font-size="${14 / 72}"`);

    // Fractional 1/8" height on paper = (1/8 * 72) / 72 = 0.125
    const fracDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 6,
      y2: 0,
      offset: 20,
      fontSize: '1/8'
    };
    const fracSvg = drawDimension(fracDim, 1.0, 18);
    expect(fracSvg).toContain(`font-size="0.125"`);
  });

  it('applies custom color to dimension lines and text, and falls back to theme variables when auto/undefined', () => {
    // 1. Custom color
    const coloredDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 0,
      offset: 20,
      color: '#ef4444',
      secondaryText: '[254mm]'
    };
    const coloredSvg = drawDimension(coloredDim, 1.0, 18);
    expect(coloredSvg).toContain('stroke="#ef4444"');
    expect(coloredSvg).toContain('style="stroke: #ef4444; color: #ef4444;"');
    expect(coloredSvg).toContain('fill="#ef4444"');

    // 2. Default theme fallback when color is undefined or 'auto'
    const defaultDim = {
      type: 'CAD::Annotation::Dimension',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 0,
      offset: 20,
      color: 'auto'
    };
    const defaultSvg = drawDimension(defaultDim, 1.0, 18);
    expect(defaultSvg).toContain('stroke="var(--cad-dim-line, #000000)"');
    expect(defaultSvg).toContain('fill="var(--cad-dim-text, #000000)"');
    expect(defaultSvg).not.toContain('#06b6d4');
  });

  it('defines arrowhead marker with refX="10" so the tip aligns flush with endpoints', () => {
    const defs = getDefs();
    expect(defs).toContain('<marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5"');
  });

  it('draws an open SVG polyline with Cartesian +Y inversion and hit area', () => {
    const shape = {
      type: 'CAD::Shape::Polyline',
      points: [
        [0, 0],
        [10, 5],
        [20, 0]
      ],
      color: '#3b82f6',
      strokeWidth: 2
    };

    const svg = drawPolyline(shape, 1.0, 18);
    // Cartesian (0, 0) -> (0, 18), (10, 5) -> (10, 13), (20, 0) -> (20, 18)
    expect(svg).toContain('<polyline points="0,18 10,13 20,18"');
    expect(svg).toContain('class="cad-hit-area"');
    expect(svg).toContain('stroke="#3b82f6"');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('stroke-linejoin="round"');
  });

  it('draws a closed SVG polyline as a polygon with fill and dasharray', () => {
    const shape = {
      type: 'Polyline',
      points: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10]
      ],
      closed: true,
      fill: 'rgba(59, 130, 246, 0.5)',
      strokeDasharray: '4 2',
      color: '#1d4ed8'
    };

    const svg = drawPolyline(shape, 1.0, 18);
    expect(svg).toContain('<polygon points="0,18 10,18 10,8 0,8"');
    expect(svg).toContain('fill="rgba(59, 130, 246, 0.5)"');
    expect(svg).toContain('stroke="#1d4ed8"');
    expect(svg).toContain('stroke-dasharray="4 2"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('stroke-linejoin="round"');
    expect(svg).toContain('<polygon points="0,18 10,18 10,8 0,8" stroke="transparent" stroke-width="0.5" fill="none" class="cad-hit-area" />');
  });

  it('supports rotation transform on polyline', () => {
    const shape = {
      type: 'CAD::Shape::Polyline',
      points: [
        [2, 3],
        [8, 3]
      ],
      rotation: 30
    };

    const svg = drawPolyline(shape, 1.0, 18);
    // Origin is points[0] = (2, 18 - 3) = (2, 15)
    expect(svg).toContain('<g transform="rotate(-30, 2, 15)">');
  });

  it('renders annotative concrete hatch when polyline is closed', () => {
    const shape = {
      type: 'CAD::Shape::Polyline',
      componentId: 'slab-1',
      points: [
        [0, 0],
        [12, 0],
        [12, 6],
        [0, 6]
      ],
      closed: true,
      hatch: 'Concrete'
    };

    const svg = drawPolyline(shape, 0.5, 18);
    expect(svg).toContain('<polygon points="0,18 12,18 12,12 0,12"');
    expect(svg).toContain('fill="url(#concrete-hatch-slab-1)"');
    // Scale = 0.5 -> patternTransform scale(1 / 0.5) = scale(2)
    expect(svg).toContain('<pattern id="concrete-hatch-slab-1" href="#concrete-hatch" patternTransform="scale(2)" />');
  });

  it('does NOT render hatch when polyline is open, even if hatch is specified', () => {
    const shape = {
      type: 'CAD::Shape::Polyline',
      componentId: 'path-1',
      points: [
        [0, 0],
        [10, 5],
        [20, 0]
      ],
      closed: false,
      hatch: 'Concrete'
    };

    const svg = drawPolyline(shape, 1.0, 18);
    expect(svg).toContain('<polyline points="0,18 10,13 20,18"');
    expect(svg).not.toContain('concrete-hatch');
    expect(svg).not.toContain('<pattern');
    expect(svg).toContain('fill="none"');
  });

  describe('cornerRadius (fillet) support', () => {
    it('maintains backwards compatibility when cornerRadius is 0 or negative', () => {
      const openZero = {
        type: 'CAD::Shape::Polyline',
        points: [[0, 0], [10, 0], [10, 10]],
        cornerRadius: 0
      };
      const openSvg = drawPolyline(openZero, 1.0, 18);
      expect(openSvg).toContain('<polyline');
      expect(openSvg).not.toContain('<path');

      const closedNeg = {
        type: 'CAD::Shape::Polyline',
        points: [[0, 0], [10, 0], [10, 10], [0, 10]],
        closed: true,
        cornerRadius: -1
      };
      const closedSvg = drawPolyline(closedNeg, 1.0, 18);
      expect(closedSvg).toContain('<polygon');
      expect(closedSvg).not.toContain('<path');
    });

    it('renders an open polyline with 90-degree fillet as an SVG path with circular arc', () => {
      // Cartesian: (0, 0) -> (0, 10) -> (10, 10), canvasHeight = 18
      // SVG: (0, 18) -> (0, 8) -> (10, 8), corner at (0, 8), r = 2
      // Tangent points: A = (0, 10), B = (2, 8)
      const shape = {
        type: 'CAD::Shape::Polyline',
        points: [
          [0, 0],
          [0, 10],
          [10, 10]
        ],
        cornerRadius: 2,
        color: '#ff0000',
        strokeWidth: 3
      };

      const svg = drawPolyline(shape, 1.0, 18);
      expect(svg).toContain('<path d="M 0 18 L 0 10 A 2 2 0 0 1 2 8 L 10 8"');
      expect(svg).toContain('class="cad-hit-area"');
      expect(svg).toContain('stroke="#ff0000"');
      expect(svg).toContain('stroke-linecap="round"');
      expect(svg).toContain('stroke-linejoin="round"');
    });

    it('renders a closed polyline (stirrup / rectangle) with all 4 corners filleted including wrap-around', () => {
      // Cartesian: (0, 0) -> (10, 0) -> (10, 10) -> (0, 10), canvasHeight = 18
      // SVG: (0, 18) -> (10, 18) -> (10, 8) -> (0, 8)
      // Radius = 2
      const shape = {
        type: 'CAD::Shape::Polyline',
        points: [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10]
        ],
        closed: true,
        cornerRadius: 2,
        fill: 'rgba(0, 255, 0, 0.2)'
      };

      const svg = drawPolyline(shape, 1.0, 18);
      // Path must have 4 arcs and end with Z
      const pathD = svg.match(/d="([^"]+)"/)?.[1];
      expect(pathD).toBeDefined();
      const arcMatches = pathD!.match(/ A 2 2 0 0 \d /g);
      expect(arcMatches).toHaveLength(4);
      expect(svg).toContain(' Z"');
      expect(svg).toContain('fill="rgba(0, 255, 0, 0.2)"');
      // Hit target and visible path share the exact same path string
      expect(svg).toContain(`<path d="${pathD}" stroke="transparent" stroke-width="0.5" fill="none" class="cad-hit-area" />`);
    });

    it('clamps corner radius on short legs to half the adjacent segment length', () => {
      // Short leg of length 2 between (0, 10) and (2, 10)
      // Requested radius 5 must be clamped to half of 2 = 1
      const shape = {
        type: 'CAD::Shape::Polyline',
        points: [
          [0, 0],
          [0, 10],
          [2, 10],
          [2, 20]
        ],
        cornerRadius: 5
      };

      const svg = drawPolyline(shape, 1.0, 18);
      expect(svg).toContain('<path');
      // Clamped radius should be 1
      expect(svg).toContain('A 1 1 0 0');
    });

    it('handles collinear points without producing invalid arcs', () => {
      const shape = {
        type: 'CAD::Shape::Polyline',
        points: [
          [0, 0],
          [5, 0],
          [10, 0],
          [10, 10]
        ],
        cornerRadius: 2
      };

      const svg = drawPolyline(shape, 1.0, 18);
      expect(svg).toContain('<path');
      // Only the corner at (10, 0) is non-collinear and should have an arc
      const pathD = svg.match(/d="([^"]+)"/)?.[1];
      expect(pathD).toBeDefined();
      const arcMatches = pathD!.match(/ A 2 2 0 0 \d /g);
      expect(arcMatches).toHaveLength(1);
    });
  });
});
