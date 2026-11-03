import { z } from 'zod';

export const DocumentMetadataSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (typeof val === 'string') return [val];
      return val;
    }),
  author: z.string().optional(),
  version: z.string().optional(),
}).passthrough();

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
