import { z } from 'zod';

const BaseShapeSchema = z.object({
  componentId: z.string().optional(),
  visible: z.any().optional(),
  color: z.string().optional(),
  strokeWidth: z.union([z.number(), z.string()]).optional(),
  strokeDasharray: z.string().optional(),
  rotation: z.union([z.number(), z.string()]).optional(),
});

export const RectangleSchema = BaseShapeSchema.extend({
  type: z.union([z.literal('CAD::Shape::Rectangle'), z.literal('Rectangle')]),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(10),
  height: z.number().default(10),
  fill: z.string().optional(),
  hatch: z.string().optional(),
});

export const LineSchema = BaseShapeSchema.extend({
  type: z.union([z.literal('CAD::Shape::Line'), z.literal('Line')]),
  x1: z.number().default(0),
  y1: z.number().default(0),
  x2: z.number().default(10),
  y2: z.number().default(10),
});

export const CircleSchema = BaseShapeSchema.extend({
  type: z.union([z.literal('CAD::Shape::Circle'), z.literal('Circle')]),
  cx: z.number().default(0),
  cy: z.number().default(0),
  r: z.number().default(5),
  fill: z.string().optional(),
});

export const TextSchema = BaseShapeSchema.extend({
  type: z.union([z.literal('CAD::Annotation::Text'), z.literal('Text')]),
  x: z.number().default(0),
  y: z.number().default(0),
  text: z.string().default('Text'),
  fontSize: z.union([z.number(), z.string()]).optional(),
});

export const TextBoxSchema = BaseShapeSchema.extend({
  type: z.union([z.literal('CAD::Annotation::TextBox'), z.literal('TextBox')]),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(10),
  text: z.string().default('Text Box'),
  fontSize: z.union([z.number(), z.string()]).optional(),
});

export const DimensionSchema = BaseShapeSchema.extend({
  type: z.union([z.literal('CAD::Annotation::Dimension'), z.literal('Dimension')]),
  x1: z.number().default(0),
  y1: z.number().default(0),
  x2: z.number().default(10),
  y2: z.number().default(0),
  offset: z.union([z.number(), z.string()]).default(20),
  text: z.string().optional(),
});

export const LeaderSchema = BaseShapeSchema.extend({
  type: z.union([z.literal('CAD::Annotation::Leader'), z.literal('Leader')]),
  x: z.number().default(0),
  y: z.number().default(0),
  dx: z.number().default(10),
  dy: z.number().default(10),
  text: z.string().default('Leader Note'),
  fontSize: z.union([z.number(), z.string()]).optional(),
});

export const ImageSchema = BaseShapeSchema.extend({
  type: z.union([z.literal('CAD::Shape::Image'), z.literal('Image')]),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().default(10),
  height: z.number().default(10),
  href: z.string().optional(),
  cropX: z.number().optional(),
  cropY: z.number().optional(),
  imgWidth: z.number().optional(),
  imgHeight: z.number().optional(),
  lockAspectRatio: z.boolean().optional(),
});

export const ConstructReferenceSchema = BaseShapeSchema.extend({
  type: z.literal('ConstructReference'),
  x: z.number().default(0),
  y: z.number().default(0),
  constructId: z.string().optional(),
  parameterOverrides: z.record(z.any()).optional(),
});

const AnyOtherSchema = z.object({
  type: z.string(),
}).passthrough();

export type GeometryPrimitive = 
  | z.infer<typeof RectangleSchema>
  | z.infer<typeof LineSchema>
  | z.infer<typeof CircleSchema>
  | z.infer<typeof TextSchema>
  | z.infer<typeof TextBoxSchema>
  | z.infer<typeof DimensionSchema>
  | z.infer<typeof LeaderSchema>
  | z.infer<typeof ImageSchema>
  | z.infer<typeof ConstructReferenceSchema>
  | z.infer<typeof AnyOtherSchema>;

export const GeometryPrimitiveSchema: z.ZodType<GeometryPrimitive> = z.union([
  RectangleSchema,
  LineSchema,
  CircleSchema,
  TextSchema,
  TextBoxSchema,
  DimensionSchema,
  LeaderSchema,
  ImageSchema,
  ConstructReferenceSchema,
  AnyOtherSchema // Fallback for unsupported types to prevent schema crash on load
]);
