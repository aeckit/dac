import { z } from 'zod';
import { DetailDocumentSchema } from './documents/detail';

export const ViewportSchema = z.object({
  detail: z.union([z.string(), DetailDocumentSchema]),
  x: z.any(),
  y: z.any(),
  scale: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  cropX: z.number().optional(),
  cropY: z.number().optional(),
  title: z.string().optional(),
  hideTitle: z.boolean().optional(),
  hideScale: z.boolean().optional(),
  detailNumber: z.string().optional(),
  hideDetailNumber: z.boolean().optional(),
  titlePosition: z.enum(['top', 'bottom']).optional(),
  titleOffsetY: z.number().optional(),
  titleNote: z.string().optional(),
  componentId: z.string().optional(),
}).passthrough();
export type Viewport = z.infer<typeof ViewportSchema>;
