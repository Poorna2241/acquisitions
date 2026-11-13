import {z} from 'zod';

export const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).trim(),
  email: z.email('Invalid email address').max(255).toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(128),
  role: z.enum(['user', 'admin'], { required_error: 'Role is required' }).default('user'),
});

export const signInSchema = z.object({
  email: z.email('Invalid email address').max(255).toLowerCase().trim(),
  password: z.string().min(1),
});
