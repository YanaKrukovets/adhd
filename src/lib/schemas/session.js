// @ts-check
import { z } from 'zod';

export const TaskStateSchema = z.enum(['pending', 'today', 'in_progress', 'done', 'deferred']);
// NOTE: 'overdue' is intentionally absent — tasks roll forward silently

// Session tool uses friendlier verbs that map to DB states in the agent execute fn
export const SessionTaskStateSchema = z.enum(['started', 'done', 'stuck', 'deferred']);

export const UpdateTaskStateInputSchema = z.object({
  // Optional: the server overrides this with the session-bound task ID. The
  // agent only knows the task title, so any ID it supplies is a guess.
  taskId: z.string().min(1).optional(),
  state: SessionTaskStateSchema,
});

export const SplitTaskInputSchema = z.object({
  taskId: z.string().min(1),
  steps: z.array(z.object({
    title: z.string().min(1).max(80),
    first_action: z.string().min(1).max(120),
    estimate_minutes: z.number().int().min(2).max(240),
    energy: z.enum(['low', 'medium', 'high']),
  })).min(2).max(6),
});

export const SetCheckinTimerInputSchema = z.object({
  minutes: z.number().int().min(1).max(120),
  reason: z.string().min(1).max(200),
});

export const LogBlockerInputSchema = z.object({
  // Optional: the server overrides this with the session-bound task ID.
  taskId: z.string().min(1).optional(),
  note: z.string().min(1).max(500),
});

export const EndSessionInputSchema = z.object({
  summary: z.string().min(1).max(1000),
  tomorrow_first_action: z.string().min(1).max(120),
});

export const EnterFlowModeInputSchema = z.object({
  minutes: z.number().int().min(10).max(180),
});

export const UserMessageSchema = z.object({
  sessionId: z.string().min(1),
  content: z.string().min(1).max(4000),
  type: z.enum(['user', 'system-checkin']).default('user'),
  checkinContext: z.object({
    elapsed: z.number().int().min(0),
    last_known_state: z.string(),
  }).optional(),
});

/** @typedef {z.infer<typeof TaskStateSchema>} TaskState */
/** @typedef {z.infer<typeof UserMessageSchema>} UserMessage */
