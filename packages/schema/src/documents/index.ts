import { z } from 'zod';
import { DetailDocumentSchema } from './detail';
import { ProjectDocumentSchema } from './project';
import { SheetConfigurationSchema } from './sheet';
import { TitleBlockDocumentSchema } from './titleBlock';
import { ConstructDocumentSchema } from './construct';

export * from './detail';
export * from './project';
export * from './sheet';
export * from './titleBlock';
export * from './construct';

export const VisualizerDocumentSchema = z.union([
  DetailDocumentSchema,
  ProjectDocumentSchema,
  SheetConfigurationSchema,
  TitleBlockDocumentSchema,
  ConstructDocumentSchema,
]);
export type VisualizerDocument = z.infer<typeof VisualizerDocumentSchema>;
