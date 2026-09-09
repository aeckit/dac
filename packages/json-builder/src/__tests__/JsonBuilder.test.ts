import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JsonBuilder } from '../JsonBuilder';
import { DetailDocument, SheetConfiguration } from '@dac/schema';

describe('@dac/json-builder mutation engine', () => {
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

  it('adds lines and texts to document', () => {
    const doc: DetailDocument = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: []
    };

    builder.setDocument(doc);
    builder.shapes.addLine({ x: 0, y: 0 });
    builder.shapes.addText({ text: 'Hello DaC' });

    const updated = builder.getDocument() as DetailDocument;
    expect(updated.geometry.length).toBe(2);
    expect(updated.geometry[0].type).toBe('CAD::Shape::Line');
    expect(updated.geometry[1].type).toBe('CAD::Annotation::Text');
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
