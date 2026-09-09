import { z } from 'zod';
import { ParameterDefinitionSchema } from '../parameters';
import { GeometryPrimitiveSchema } from '../primitives';

export const TitleBlockDocumentSchema = z.object({
  type: z.literal('CAD::TitleBlock'),
  version: z.string(),
  parameters: z.record(ParameterDefinitionSchema).optional(),
  geometry: z.array(GeometryPrimitiveSchema),
}).passthrough();
export type TitleBlockDocument = z.infer<typeof TitleBlockDocumentSchema>;
