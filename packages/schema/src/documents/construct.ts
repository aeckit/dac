import { z } from 'zod';
import { ParameterDefinitionSchema } from '../parameters';
import { GeometryPrimitiveSchema } from '../primitives';

export const ConstructDocumentSchema = z.object({
  type: z.literal('CAD::Construct'),
  version: z.string(),
  parameters: z.record(ParameterDefinitionSchema).optional(),
  geometry: z.array(GeometryPrimitiveSchema),
}).passthrough();
export type ConstructDocument = z.infer<typeof ConstructDocumentSchema>;
