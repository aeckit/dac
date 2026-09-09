import {
  DetailDocumentSchema,
  DetailDocument,
  VisualizerDocumentSchema,
  VisualizerDocument,
} from './documents';

export function validateDetailDocument(data: unknown): DetailDocument {
  return DetailDocumentSchema.parse(data);
}

export function validateVisualizerDocument(data: unknown): VisualizerDocument {
  return VisualizerDocumentSchema.parse(data);
}

export function safeValidateVisualizerDocument(data: unknown) {
  return VisualizerDocumentSchema.safeParse(data);
}

export async function exportJsonSchema(): Promise<object> {
  const { zodToJsonSchema } = await import('zod-to-json-schema');
  return zodToJsonSchema(VisualizerDocumentSchema, {
    name: 'DrawingAsCodeDocument',
    $refStrategy: 'relative',
  });
}
