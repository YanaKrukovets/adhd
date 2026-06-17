// @ts-check
import { z } from 'zod';

export const TaskSchema = z.object({
  title: z.string().min(1).max(80),
  // Long enough to hold "Open chrome and go to <full url>" — the prompt
  // instructs embedding full URLs in first_action. Capped at tweet length so
  // the model still can't return a paragraph.
  first_action: z.string().min(1).max(280),
  estimate_minutes: z.number().int().min(2).max(240),
  energy: z.enum(['low', 'medium', 'high']),
  blockers: z.array(z.string()).default([]),
});

export const PlanSchema = z.object({
  clarifying_question: z.string().nullable(),
  tasks: z.array(TaskSchema).max(12),
  suggested_today: z.array(z.number().int().min(0)).max(3),
});

/** @typedef {z.infer<typeof PlanSchema>} Plan */
/** @typedef {z.infer<typeof TaskSchema>} Task */
