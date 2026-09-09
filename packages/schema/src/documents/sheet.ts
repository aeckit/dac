import { z } from 'zod';
import { ViewportSchema } from '../viewport';
import { GeometryPrimitiveSchema } from '../primitives';

export const SheetConfigurationSchema = z.object({
  type: z.literal('CAD::SheetConfiguration'),
  sheetNumber: z.string(),
  sheetName: z.string(),
  titleBlockOffsetX: z.number().optional(),
  titleBlockOffsetY: z.number().optional(),
  viewports: z.array(ViewportSchema),
  geometry: z.array(GeometryPrimitiveSchema).optional(),
}).passthrough();
export type SheetConfiguration = z.infer<typeof SheetConfigurationSchema>;
