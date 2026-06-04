import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.')
});

export const loginOtpSchema = z.object({
  factorId: z.string().min(1, 'A verified 2FA factor is required.'),
  challengeId: z.string().min(1, 'A valid 2FA challenge is required.'),
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit authenticator code.')
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email('A valid email is required.')
});

export const resetSchema = z.object({
  email: z.string().email('A valid email is required.')
});
