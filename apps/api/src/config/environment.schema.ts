import { z } from 'zod';

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['error', 'warn', 'log', 'debug', 'verbose'])
      .default('log'),
    // Explicit enum transform prevents "false" string being coerced to truthy boolean
    DATABASE_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    DATABASE_URL: z
      .string()
      .refine((url) => url.startsWith('postgresql://'), {
        message: 'DATABASE_URL must start with postgresql://',
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.DATABASE_ENABLED && !data.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required when DATABASE_ENABLED is true',
      });
    }
  });

export type EnvironmentVariables = z.infer<typeof environmentSchema>;
