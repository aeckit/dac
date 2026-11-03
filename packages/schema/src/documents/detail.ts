import { z } from 'zod';
import { ParameterDefinitionSchema } from '../parameters';
import { GeometryPrimitiveSchema } from '../primitives';
import { DocumentMetadataSchema } from '../metadata';

export const DetailDocumentSchema = z.object({
  type: z.literal('CAD::Detail'),
  version: z.string(),
  scale: z.string(),
  metadata: DocumentMetadataSchema.optional(),
  parameters: z.record(ParameterDefinitionSchema).optional(),
  geometry: z.array(GeometryPrimitiveSchema),
}).passthrough();
export type DetailDocument = z.infer<typeof DetailDocumentSchema>;
