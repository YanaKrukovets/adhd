// @ts-check
import { z } from 'zod';

export const PlanRequestSchema = z.object({
  intention: z.string().min(1).max(2000),
  clarifying_answer: z.string().max(1000).optional(),
  context: z.object({
    timezone: z.string().default('UTC'),
    energy_level: z.enum(['low', 'medium', 'high']).default('medium'),
  }).optional(),
});

export const ReplanRequestSchema = z.object({
  userId: z.string().min(1),
});

export const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16),
});

/**
 * Validates required environment variables at startup.
 * @returns {z.infer<typeof EnvSchema>}
 */
export function validateEnv() {
  return EnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    AUTH_SECRET: process.env.AUTH_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
  });
}
