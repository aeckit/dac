import { describe, it, expect } from 'vitest';
import {
  DetailDocumentSchema,
  SheetConfigurationSchema,
  validateDetailDocument,
  safeValidateVisualizerDocument
} from './index';

describe('@dac/schema contract verification', () => {
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

  it('exports standard JSON Schema for polyglot consumers (Python Pydantic models)', async () => {
    const { exportJsonSchema } = await import('./index');
    const jsonSchema = await exportJsonSchema();
    expect(jsonSchema).toBeDefined();
    expect((jsonSchema as any).definitions?.DrawingAsCodeDocument || (jsonSchema as any).$ref).toBeDefined();
  });
});
