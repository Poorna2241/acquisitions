import { z } from 'zod';

export const brandIdSchema = z.object({
  id: z.coerce.number().int().positive('Brand ID must be a positive integer'),
});

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100).trim(),
  slug: z.string().max(120).trim().optional(),
  description: z.string().max(1000).optional(),
  logo: z
    .string()
    .url('Invalid logo URL')
    .max(500)
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Invalid website URL')
    .max(255)
    .optional()
    .or(z.literal('')),
});

export const updateBrandSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    slug: z.string().max(120).trim().optional(),
    description: z.string().max(1000).nullable().optional(),
    logo: z
      .string()
      .url('Invalid logo URL')
      .max(500)
      .nullable()
      .optional()
      .or(z.literal('')),
    website: z
      .string()
      .url('Invalid website URL')
      .max(255)
      .nullable()
      .optional()
      .or(z.literal('')),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'At least one field is required to update brand',
  });
