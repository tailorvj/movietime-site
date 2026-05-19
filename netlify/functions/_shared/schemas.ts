import { z } from 'zod'

export const requestAccessSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3)
    .max(254)
    .email()
    .transform((value) => value.toLowerCase()),
  locale: z.enum(['he', 'ru']).optional().default('he'),
})

export type RequestAccessInput = z.infer<typeof requestAccessSchema>

export const tokenIdSchema = z
  .string()
  .uuid({ message: 'Invalid token format' })

export const tokenRecordSchema = z.object({
  emailHash: z.string().min(16).max(16),
  used: z.boolean(),
  createdAt: z.string(),
  expiresAt: z.string(),
  ipHash: z.string().optional(),
  locale: z.enum(['he', 'ru']).default('he'),
  usedAt: z.string().optional(),
})

export type TokenRecord = z.infer<typeof tokenRecordSchema>
