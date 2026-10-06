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

  it('adds lines, texts, and leaders to document', () => {
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

    const updated = builder.getDocument() as DetailDocument;
    expect(updated.geometry.length).toBe(3);
    expect(updated.geometry[0].type).toBe('CAD::Shape::Line');
    expect(updated.geometry[1].type).toBe('CAD::Annotation::Text');
    expect(updated.geometry[2].type).toBe('CAD::Annotation::Leader');
    expect((updated.geometry[2] as any).text).toBe('Point 1');
    expect((updated.geometry[2] as any).dx).toBe(15);
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
});
