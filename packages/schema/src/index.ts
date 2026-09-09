import { z } from 'zod';

export const ParameterOptionSchema = z.object({
  label: z.string(),
  value: z.any(),
  variables: z.record(z.union([z.number(), z.string(), z.boolean()])).optional(),
});
export type ParameterOption = z.infer<typeof ParameterOptionSchema>;

export const ParameterDefinitionSchema = z.object({
  type: z.string(),
  default: z.any(),
  value: z.any().optional(),
  componentId: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  label: z.string().optional(),
  options: z.array(ParameterOptionSchema).optional(),
});
export type ParameterDefinition = z.infer<typeof ParameterDefinitionSchema>;

export const GeometryPrimitiveSchema = z.object({
  type: z.string(),
  x: z.any().optional(),
  y: z.any().optional(),
  x1: z.any().optional(),
  y1: z.any().optional(),
  x2: z.any().optional(),
  y2: z.any().optional(),
  cx: z.any().optional(),
  cy: z.any().optional(),
  r: z.any().optional(),
  dx: z.any().optional(),
  dy: z.any().optional(),
  width: z.any().optional(),
  height: z.any().optional(),
  text: z.any().optional(),
  fontSize: z.union([z.number(), z.string()]).optional(),
  color: z.string().optional(),
  fill: z.string().optional(),
  strokeWidth: z.union([z.number(), z.string()]).optional(),
  strokeDasharray: z.string().optional(),
  cropX: z.any().optional(),
  cropY: z.any().optional(),
  imgWidth: z.any().optional(),
  imgHeight: z.any().optional(),
  hatch: z.string().optional(),
  offset: z.union([z.number(), z.string()]).optional(),
  href: z.string().optional(),
  lockAspectRatio: z.boolean().optional(),
  componentId: z.string().optional(),
  componentType: z.string().optional(),
  visible: z.any().optional(),
  // Construct Reference properties
  constructId: z.string().optional(),
  rotation: z.union([z.number(), z.string()]).optional(),
  parameterOverrides: z.record(z.any()).optional(),
}).passthrough();
export type GeometryPrimitive = z.infer<typeof GeometryPrimitiveSchema>;

export const DetailDocumentSchema = z.object({
  type: z.literal('CAD::Detail'),
  version: z.string(),
  scale: z.string(),
  parameters: z.record(ParameterDefinitionSchema).optional(),
  geometry: z.array(GeometryPrimitiveSchema),
}).passthrough();
export type DetailDocument = z.infer<typeof DetailDocumentSchema>;

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

export const TitleBlockDocumentSchema = z.object({
  type: z.literal('CAD::TitleBlock'),
  version: z.string(),
  parameters: z.record(ParameterDefinitionSchema).optional(),
  geometry: z.array(GeometryPrimitiveSchema),
}).passthrough();
export type TitleBlockDocument = z.infer<typeof TitleBlockDocumentSchema>;

export const ConstructDocumentSchema = z.object({
  type: z.literal('CAD::Construct'),
  version: z.string(),
  parameters: z.record(ParameterDefinitionSchema).optional(),
  geometry: z.array(GeometryPrimitiveSchema),
}).passthrough();
export type ConstructDocument = z.infer<typeof ConstructDocumentSchema>;

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

export const VisualizerDocumentSchema = z.union([
  DetailDocumentSchema,
  ProjectDocumentSchema,
  SheetConfigurationSchema,
  TitleBlockDocumentSchema,
  ConstructDocumentSchema,
]);
export type VisualizerDocument = z.infer<typeof VisualizerDocumentSchema>;

// Helper validation functions
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

