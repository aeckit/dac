import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JsonBuilder } from '../JsonBuilder';
import { DetailDocument, SheetConfiguration } from '@aeckit/dac-schema';

describe('@aeckit/dac-json-builder mutation engine', () => {
  let builder: JsonBuilder;

  beforeEach(() => {
    builder = new JsonBuilder();
  });

  it('initializes with a Detail document and adds rectangle', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: []
    };

    builder.setDocument(doc);
    const rect = builder.shapes.addRectangle({ x: 5, y: 10, width: 20, height: 15 });
    
    expect(rect).toBeDefined();
    expect(rect.type).toBe('CAD::Shape::Rectangle');
    expect(rect.x).toBe(5);

    const updated = builder.getDocument() as DetailDocument;
    expect(updated.geometry.length).toBe(1);
    expect(updated.geometry[0].width).toBe(20);
  });

  it('adds lines, texts, leaders, and dimensions to document', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: []
    };

    builder.setDocument(doc);
    builder.shapes.addLine({ x: 0, y: 0 });
    builder.shapes.addText({ text: 'Hello DaC' });
    builder.shapes.addLeader({ x: 5, y: 5, dx: 15, dy: -10, text: 'Point 1' });
    const dim = builder.shapes.addDimension({ x1: 0, y1: 0, x2: 12, y2: 0, offset: 20, prefix: 'TYP. ', suffix: ' (O.C.)' });

    const updated = builder.getDocument() as DetailDocument;
    expect(updated.geometry.length).toBe(4);
    expect(updated.geometry[0].type).toBe('CAD::Shape::Line');
    expect(updated.geometry[1].type).toBe('CAD::Annotation::Text');
    expect(updated.geometry[2].type).toBe('CAD::Annotation::Leader');
    expect(updated.geometry[3].type).toBe('CAD::Annotation::Dimension');
    expect((updated.geometry[2] as any).text).toBe('Point 1');
    expect((updated.geometry[2] as any).dx).toBe(15);
    expect((updated.geometry[3] as any).x2).toBe(12);
    expect((updated.geometry[3] as any).prefix).toBe('TYP. ');
    expect((updated.geometry[3] as any).suffix).toBe(' (O.C.)');
    expect(dim.componentId).toBeDefined();
  });

  it('adds open and closed polylines using shapes.addPolyline', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: []
    };

    builder.setDocument(doc);
    const poly1 = builder.shapes.addPolyline(
      [
        [0, 0],
        [10, 5],
        [20, 0]
      ],
      { color: '#ef4444', strokeWidth: 2 }
    );

    expect(poly1).toBeDefined();
    expect(poly1.type).toBe('CAD::Shape::Polyline');
    expect(poly1.componentId).toMatch(/^polyline_/);
    expect(poly1.points).toHaveLength(3);
    expect(poly1.closed).toBe(false);
    expect(poly1.color).toBe('#ef4444');

    const poly2 = builder.addPolyline(
      [
        [0, 0],
        [5, 10],
        [10, 0]
      ],
      { closed: true, fill: '#3b82f6' }
    );

    expect(poly2.closed).toBe(true);
    expect(poly2.fill).toBe('#3b82f6');

    const updated = builder.getDocument() as DetailDocument;
    expect(updated.geometry.length).toBe(2);
    expect((updated.geometry[0] as any).points).toEqual([[0, 0], [10, 5], [20, 0]]);
    expect((updated.geometry[1] as any).closed).toBe(true);
  });

  it('updates and deletes components', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        { type: 'CAD::Shape::Rectangle', componentId: 'test-box', width: 10 }
      ]
    };

    builder.setDocument(doc);
    builder.components.updateComponent('test-box', { width: 25 });

    let updated = builder.getDocument() as DetailDocument;
    expect(updated.geometry[0].width).toBe(25);

    builder.components.deleteComponent('test-box');
    updated = builder.getDocument() as DetailDocument;
    expect(updated.geometry.length).toBe(0);
  });

  it('emits document_changed event on mutation', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: []
    };

    builder.setDocument(doc);
    const listener = vi.fn();
    builder.addEventListener('document_changed', listener);

    builder.shapes.addRectangle();
    expect(listener).toHaveBeenCalled();
  });

  it('supports mutating CAD::Construct documents', () => {
    const doc = {
      type: 'CAD::Construct',
      version: '1.0',
      parameters: { width: 5.5 },
      geometry: [
        { type: 'CAD::Shape::Rectangle', componentId: 'wood-section', width: 5.5, height: 1.5 }
      ]
    };

    builder.setDocument(doc as any);
    builder.components.updateComponent('wood-section', { width: 7.25 });

    const updated = builder.getDocument() as any;
    expect(updated.geometry[0].width).toBe(7.25);
  });
});
