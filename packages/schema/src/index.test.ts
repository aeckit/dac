import { describe, it, expect } from 'vitest';
import {
  DetailDocumentSchema,
  SheetConfigurationSchema,
  validateDetailDocument,
  safeValidateVisualizerDocument
} from './index';

describe('@aeckit/dac-schema contract verification', () => {
  it('validates a valid CAD::Detail document', () => {
    const raw = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [
        { type: 'CAD::Shape::Rectangle', x: 0, y: 0, width: 10, height: 10 }
      ]
    };

    const doc = validateDetailDocument(raw);
    expect(doc.type).toBe('CAD::Detail');
    expect(doc.geometry.length).toBe(1);
  });

  it('rejects invalid document structure safely', () => {
    const invalid = {
      type: 'CAD::Invalid',
      version: '1.0'
    };

    const result = safeValidateVisualizerDocument(invalid);
    expect(result.success).toBe(false);
  });

  it('validates a CAD::SheetConfiguration with viewports', () => {
    const raw = {
      type: 'CAD::SheetConfiguration',
      sheetNumber: 'A101',
      sheetName: 'First Floor Plan',
      viewports: [
        { detail: 'detail.json', x: 2, y: 2, scale: '1:1' }
      ]
    };

    const parsed = SheetConfigurationSchema.parse(raw);
    expect(parsed.sheetNumber).toBe('A101');
    expect(parsed.viewports.length).toBe(1);
  });

  it('validates CAD::Annotation::Dimension with prefix, suffix, and textOverride', () => {
    const raw = {
      type: 'CAD::Annotation::Dimension',
      componentId: 'dim-1',
      x1: 0,
      y1: 0,
      x2: 5.5,
      y2: 0,
      offset: 20,
      prefix: 'TYP. ',
      suffix: ' (2x6)',
      textOverride: '5.5"',
      secondaryText: '[140mm]',
      textPosition: 'above',
      fontSize: 12
    };

    const doc = validateDetailDocument({
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      geometry: [raw]
    });
    expect(doc.geometry[0].type).toBe('CAD::Annotation::Dimension');
    expect((doc.geometry[0] as any).prefix).toBe('TYP. ');
    expect((doc.geometry[0] as any).suffix).toBe(' (2x6)');
    expect((doc.geometry[0] as any).textOverride).toBe('5.5"');
    expect((doc.geometry[0] as any).secondaryText).toBe('[140mm]');
    expect((doc.geometry[0] as any).textPosition).toBe('above');
    expect((doc.geometry[0] as any).fontSize).toBe(12);
  });

  it('validates document with optional metadata and transforms single string note to array', () => {
    const raw = {
      type: 'CAD::Detail',
      version: '1.0',
      scale: '1:1',
      metadata: {
        id: 'joist-detail',
        title: 'Floor Joist Assembly',
        category: 'Framing',
        tags: ['timber', 'framing'],
        notes: 'Field verify dimensions before fabrication.'
      },
      geometry: []
    };

    const doc = validateDetailDocument(raw);
    expect(doc.metadata?.title).toBe('Floor Joist Assembly');
    expect(doc.metadata?.category).toBe('Framing');
    expect(doc.metadata?.tags).toEqual(['timber', 'framing']);
    expect(doc.metadata?.notes).toEqual(['Field verify dimensions before fabrication.']);
  });

  it('exports standard JSON Schema for polyglot consumers (Python Pydantic models)', async () => {
    const { exportJsonSchema } = await import('./index');
    const jsonSchema = await exportJsonSchema();
    expect(jsonSchema).toBeDefined();
    expect((jsonSchema as any).definitions?.DrawingAsCodeDocument || (jsonSchema as any).$ref).toBeDefined();
  });
});
