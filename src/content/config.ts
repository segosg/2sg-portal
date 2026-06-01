import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.date(),
    status: z.enum(['draft', 'published']).default('draft'),
  }),
});

export const collections = { blog };