// @ts-check
import { z } from 'zod';

/**
 * Shape of a single UIMessage part we accept from the client. The Vercel AI SDK
 * sends richer parts than this, but the calm companion is text-only — we only
 * ever read `type: 'text'` parts, so validate just enough to convert safely.
 */
const UIMessagePartSchema = z
  .object({
    type: z.string(),
    text: z.string().optional(),
  })
  .passthrough();

const UIMessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system']),
    parts: z.array(UIMessagePartSchema).default([]),
  })
  .passthrough();

/**
 * Request body for POST /api/calm. The calm companion is stateless — there is
 * no work session, no task binding, just a conversation. Capped at a sane
 * length so a runaway client can't push an unbounded transcript at the model.
 */
export const CalmRequestSchema = z.object({
  messages: z.array(UIMessageSchema).min(1).max(100),
});
