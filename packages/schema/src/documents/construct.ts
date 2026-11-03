import { z } from 'zod';
import { ParameterDefinitionSchema } from '../parameters';
import { GeometryPrimitiveSchema } from '../primitives';
import { DocumentMetadataSchema } from '../metadata';

export const ConstructDocumentSchema = z.object({
  type: z.literal('CAD::Construct'),
  version: z.string(),
  metadata: DocumentMetadataSchema.optional(),
  parameters: z.record(ParameterDefinitionSchema).optional(),
  geometry: z.array(GeometryPrimitiveSchema),
}).passthrough();
export type ConstructDocument = z.infer<typeof ConstructDocumentSchema>;
