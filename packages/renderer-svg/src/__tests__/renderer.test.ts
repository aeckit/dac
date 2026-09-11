import { describe, it, expect } from 'vitest';
import {
  renderSolvedDetail,
  renderSolvedGroups,
  drawLine,
  drawRectangle,
  drawCircle
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
});
