import { z } from 'zod';

export const userIdSchema = z.object({
  id: z.coerce.number().int().positive('User id must be a positive integer'),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255).trim().optional(),
    email: z
      .email('Invalid email address')
      .max(255)
      .toLowerCase()
      .trim()
      .optional(),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters long')
      .max(128)
      .optional(),
    role: z.enum(['user', 'admin']).optional(),
  })
  .refine(updates => Object.keys(updates).length > 0, {
    message: 'At least one field is required to update',
  });
