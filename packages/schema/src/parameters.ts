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
