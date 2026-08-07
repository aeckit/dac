import { describe, it, expect } from 'vitest';
import {
  compileGeometryGroups,
  renderDetail,
  renderSheet,
  resolveScaleMultiplier,
  DetailDocument,
  SheetDocument
} from './index';

describe('Cartesian (+Y = UP) Coordinate System Unit Tests', () => {
  describe('A. Core Solver Shape Inversion Tests', () => {
    it('1. Line Inversion (drawLine): y1 and y2 are inverted relative to canvasHeight', () => {
      const doc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1:1',
        geometry: [
          { type: 'CAD::Shape::Line', x1: 0, y1: 0, x2: 10, y2: 18 },
          { type: 'CAD::Shape::Line', x1: 5, y1: -2, x2: 5, y2: 20 }
        ]
      };

      const svg = compileGeometryGroups(doc, 1, {}, 18);
      const container = document.createElement('div');
      container.innerHTML = `<svg>${svg}</svg>`;
      const lines = container.querySelectorAll('line');

      expect(lines.length).toBe(2);

      // (y1: 0, y2: 18) -> SVG y1="18", y2="0"
      expect(lines[0].getAttribute('y1')).toBe('18');
      expect(lines[0].getAttribute('y2')).toBe('0');

      // Negative & Overflow coordinates: (y1: -2, y2: 20) -> SVG y1="20" (18 - (-2)), y2="-2" (18 - 20)
      expect(lines[1].getAttribute('y1')).toBe('20');
      expect(lines[1].getAttribute('y2')).toBe('-2');
    });

    it('2. Rectangle Inversion (drawRectangle): y is inverted using canvasHeight - (y + height)', () => {
      const doc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1:1',
        geometry: [
          { type: 'CAD::Shape::Rectangle', x: 0, y: 2, width: 10, height: 4 },
          { type: 'CAD::Shape::Rectangle', x: 0, y: 0, width: 5, height: 18 },
          { type: 'CAD::Shape::Rectangle', x: 0, y: -4, width: 5, height: 4 }
        ]
      };

      const svg = compileGeometryGroups(doc, 1, {}, 18);
      const container = document.createElement('div');
      container.innerHTML = `<svg>${svg}</svg>`;
      const rects = container.querySelectorAll('rect');

      expect(rects.length).toBe(3);

      // y=2, h=4 -> 18 - (2 + 4) = 12
      expect(rects[0].getAttribute('y')).toBe('12');
      expect(rects[0].getAttribute('height')).toBe('4');

      // y=0, h=18 -> 18 - (0 + 18) = 0
      expect(rects[1].getAttribute('y')).toBe('0');

      // y=-4, h=4 -> 18 - (-4 + 4) = 18
      expect(rects[2].getAttribute('y')).toBe('18');
    });

    it('3. Text & TextBox Inversion (drawText, drawTextBox): single-line text and multi-line notes invert correctly', () => {
      const doc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1:1',
        geometry: [
          { type: 'CAD::Annotation::Text', x: 5, y: 10, text: 'Sample Text' },
          { type: 'CAD::Annotation::Text', x: 0, y: 0, text: 'Origin Text' },
          { type: 'CAD::Annotation::TextBox', x: 2, y: 16, width: 8, text: 'General Notes\nLine 2' }
        ]
      };

      const svg = compileGeometryGroups(doc, 1, {}, 18);
      const container = document.createElement('div');
      container.innerHTML = `<svg>${svg}</svg>`;
      const texts = container.querySelectorAll('text');
      const foreignObjects = container.querySelectorAll('foreignObject');

      expect(texts.length).toBe(2);
      expect(foreignObjects.length).toBe(1);

      // y=10 -> SVG y="8" (18 - 10)
      expect(texts[0].getAttribute('y')).toBe('8');
      expect(texts[0].textContent).toBe('Sample Text');

      // y=0 -> SVG y="18" (18 - 0)
      expect(texts[1].getAttribute('y')).toBe('18');

      // TextBox y=16 -> foreignObject y="2" (18 - 16)
      expect(foreignObjects[0].getAttribute('y')).toBe('2');
      expect(foreignObjects[0].textContent).toContain('General Notes');
    });

    it('4. Dimension & Leader Direction (drawDimension, drawLeader): offsets extend upwards (+Y in CAD = -Y in SVG)', () => {
      const doc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1:1',
        geometry: [
          // Leader with dy=4 (positive in Cartesian space goes up, which in SVG is -4 relative to inverted anchorY)
          { type: 'CAD::Annotation::Leader', x: 10, y: 10, dx: 5, dy: 4, text: 'Leader Note' }
        ]
      };

      const svg = compileGeometryGroups(doc, 1, {}, 18);
      const container = document.createElement('div');
      container.innerHTML = `<svg>${svg}</svg>`;
      const leaderLine = container.querySelector('line.dimension-line') as SVGLineElement;
      const leaderText = container.querySelector('text.cad-text') as SVGTextElement;

      expect(leaderLine).not.toBeNull();
      expect(leaderText).not.toBeNull();

      // anchorY = 18 - 10 = 8.
      // dy=4 -> offsetY = -(4 / 1) = -4.
      // textY = anchorY + offsetY = 8 - 4 = 4.
      expect(leaderLine.getAttribute('y1')).toBe('8');
      expect(leaderLine.getAttribute('y2')).toBe('4');
      expect(Number(leaderText.getAttribute('y'))).toBeCloseTo(4 + (3 / 72), 3);
    });

    it('4b. Dimension line positive offset extends upwards in Cartesian space', () => {
      const doc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1:1',
        geometry: [
          // Dimension between (0, 0) and (10, 0) with positive offset 72 -> 1 unit in scale 1
          { type: 'CAD::Annotation::Dimension', x1: 0, y1: 0, x2: 10, y2: 0, offset: 72, text: '10.0' }
        ]
      };

      const svg = compileGeometryGroups(doc, 1, {}, 18);
      const container = document.createElement('div');
      container.innerHTML = `<svg>${svg}</svg>`;

      // The dimension lines include extension lines (index 0, 1) and main dimension line (index 2)
      const dimLines = container.querySelectorAll('line');
      expect(dimLines.length).toBeGreaterThanOrEqual(3);

      // Inverted y1=18, y2=18. With positive offset=72 (1 unit), offset in SVG is -1, so dim line is at y=17 (above baseline y=18)
      // Let's check the main dimension line (the third line in drawDimension output, with marker-start)
      const mainDimLine = container.querySelector('line[marker-start="url(#arrow)"]') || dimLines[2];
      expect(mainDimLine.getAttribute('y1')).toBe('17');
      expect(mainDimLine.getAttribute('y2')).toBe('17');
    });
  });

  describe('B. Sheet & Viewport Placement Tests (renderSheet)', () => {
    it('1. 1:1 Scale Viewport on Arch D (36" x 24")', () => {
      const detailDoc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1:1',
        geometry: [
          { type: 'CAD::Shape::Rectangle', x: 0, y: 0, width: 10, height: 10 }
        ]
      };

      const sheetDoc: SheetDocument = {
        type: 'CAD::Sheet',
        sheetNumber: 'A101',
        sheetName: 'Plan',
        paperSize: 'ARCH D',
        viewports: [
          { detail: detailDoc, x: 2, y: 2, scale: '1:1' }
        ]
      };

      const svg = renderSheet(sheetDoc);
      const container = document.createElement('div');
      container.innerHTML = svg;

      const viewportGroup = container.querySelector('g[data-viewport-id^="viewport-"]');
      expect(viewportGroup).not.toBeNull();

      // vpSvgY = paperHeight - vpY - (canvasHeight * scaleMultiplier) = 24 - 2 - (18 * 1) = 4
      expect(viewportGroup!.getAttribute('transform')).toBe('translate(2, 4) scale(1)');
    });

    it('2. Architectural Scale Viewport (1"=1\'-0", multiplier 1/12) on Arch D (36" x 24")', () => {
      const detailDoc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1"=1\'-0"',
        geometry: [
          { type: 'CAD::Shape::Rectangle', x: 0, y: 0, width: 10, height: 10 }
        ]
      };

      const sheetDoc: SheetDocument = {
        type: 'CAD::Sheet',
        sheetNumber: 'A102',
        sheetName: 'Details Sheet',
        paperSize: 'ARCH D',
        viewports: [
          { detail: detailDoc, x: 2, y: 2, scale: '1"=1\'-0"' }
        ]
      };

      const svg = renderSheet(sheetDoc);
      const container = document.createElement('div');
      container.innerHTML = svg;

      const viewportGroup = container.querySelector('g[data-viewport-id^="viewport-"]');
      expect(viewportGroup).not.toBeNull();

      const scaleMultiplier = resolveScaleMultiplier('1"=1\'-0"'); // 1/12 = 0.08333333333333333
      const expectedY = 24 - 2 - (18 * scaleMultiplier); // 24 - 2 - 1.5 = 20.5

      const transform = viewportGroup!.getAttribute('transform') || '';
      expect(transform).toContain('translate(2, 20.5)');
      expect(transform).toContain(`scale(${scaleMultiplier})`);
    });

    it('3. Architectural Scale Viewport (1/4"=1\'-0", multiplier 1/48) at origin (0, 0)', () => {
      const detailDoc: DetailDocument = {
        type: 'CAD::Detail',
        version: '1.0.0',
        scale: '1/4"=1\'-0"',
        geometry: []
      };

      const sheetDoc: SheetDocument = {
        type: 'CAD::Sheet',
        sheetNumber: 'A103',
        sheetName: 'Origin Sheet',
        paperSize: 'ARCH D',
        viewports: [
          { detail: detailDoc, x: 0, y: 0, scale: '1/4"=1\'-0"' }
        ]
      };

      const svg = renderSheet(sheetDoc);
      const container = document.createElement('div');
      container.innerHTML = svg;

      const viewportGroup = container.querySelector('g[data-viewport-id^="viewport-"]');
      expect(viewportGroup).not.toBeNull();

      const scaleMultiplier = resolveScaleMultiplier('1/4"=1\'-0"'); // 1/48
      const expectedY = 24 - 0 - (18 * scaleMultiplier); // 24 - 0.375 = 23.625

      const transform = viewportGroup!.getAttribute('transform') || '';
      expect(transform).toContain('translate(0, 23.625)');
      expect(transform).toContain(`scale(${scaleMultiplier})`);
    });
  });
});
