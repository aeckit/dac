import { z } from 'zod';
import { TitleBlockDocumentSchema } from './titleBlock';
import { SheetConfigurationSchema } from './sheet';

export const ProjectDocumentSchema = z.object({
  type: z.literal('CAD::Project'),
  projectName: z.string(),
  defaultTitleBlockRef: z.union([z.string(), TitleBlockDocumentSchema]).optional(),
  defaultPaperSize: z.string().optional(),
  titleBlockOffsetX: z.number().optional(),
  titleBlockOffsetY: z.number().optional(),
  parameters: z.record(z.any()).optional(),
  sheets: z.array(z.union([z.string(), SheetConfigurationSchema])),
}).passthrough();
export type ProjectDocument = z.infer<typeof ProjectDocumentSchema>;
