import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.')
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email('A valid email is required.')
});

export const resetSchema = z.object({
  email: z.string().email('A valid email is required.')
});
