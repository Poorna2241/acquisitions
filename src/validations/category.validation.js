import { z } from 'zod';

export const categoryIdSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive('Category ID must be a positive integer'),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100).trim(),
  slug: z.string().max(120).trim().optional(),
  description: z.string().max(1000).optional(),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  image: z
    .string()
    .url('Invalid image URL')
    .max(500)
    .optional()
    .or(z.literal('')),
});

export const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    slug: z.string().max(120).trim().optional(),
    description: z.string().max(1000).nullable().optional(),
    parentId: z.coerce.number().int().positive().nullable().optional(),
    image: z
      .string()
      .url('Invalid image URL')
      .max(500)
      .nullable()
      .optional()
      .or(z.literal('')),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required to update category',
  });
