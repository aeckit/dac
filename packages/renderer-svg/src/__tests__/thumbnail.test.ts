import { describe, it, expect } from 'vitest';
import { computeBoundingBox } from '../bounds';
import { renderThumbnailSvg } from '../thumbnail';
import type { DetailDocument } from '@aeckit/dac-schema';

describe('@aeckit/dac-renderer-svg bounds and thumbnail tests', () => {
  it('computes bounding box for simple rectangle', () => {
    const groups: any[] = [
      {
        componentId: 'box',
        shapes: [
          { type: 'CAD::Shape::Rectangle', x: 2, y: 3, width: 10, height: 5 }
        ]
      }
    ];

    const bounds = computeBoundingBox(groups);
    expect(bounds.hasGeometry).toBe(true);
    expect(bounds.minX).toBe(2);
    expect(bounds.minY).toBe(3);
    expect(bounds.maxX).toBe(12);
    expect(bounds.maxY).toBe(8);
    expect(bounds.width).toBe(10);
    expect(bounds.height).toBe(5);
  });

  it('renders a valid thumbnail SVG for a detail document', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        {
          type: 'CAD::Shape::Rectangle',
          componentId: 'stud',
          x: 0,
          y: 0,
          width: 3.5,
          height: 1.5,
          color: '#d97706'
        }
      ]
    };

    const svg = renderThumbnailSvg(doc, { theme: 'light' });
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('viewBox=');
    expect(svg).toContain('data-component-id="stud"');
  });

  it('handles empty or malformed geometry gracefully', () => {
    const emptyDoc: any = { type: 'CAD::Detail', version: '1.0', geometry: [] };
    const svg = renderThumbnailSvg(emptyDoc);
    expect(svg).toContain('<svg');
  });
});
