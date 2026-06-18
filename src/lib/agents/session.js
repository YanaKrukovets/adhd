// @ts-check
import { streamText, tool, stepCountIs } from 'ai';
import { google } from '@ai-sdk/google';
import { randomUUID } from 'crypto';
import { loadPrompt } from '../prompts/load.js';
import { calculateCost } from '../telemetry.js';
import {
  UpdateTaskStateInputSchema,
  SplitTaskInputSchema,
  SetCheckinTimerInputSchema,
  LogBlockerInputSchema,
  EndSessionInputSchema,
  EnterFlowModeInputSchema,
} from '../schemas/session.js';
import {
  updateTask,
  createTask,
  updateWorkSession,
  appendSessionEvent,
  logAgentCall,
} from '../db/queries.js';

export const SESSION_MODEL = 'gemini-3.1-flash-lite';
export const SESSION_PROMPT_VERSION = '1.3.0';

/**
 * Runs the session agent and returns a streamText result ready for toUIMessageStreamResponse().
 *
 * @param {object} params
 * @param {string} params.sessionId
 * @param {string} params.userId
 * @param {string|null} [params.taskId] authoritative task bound to this session
 * @param {string} params.taskTitle
 * @param {string} params.firstAction
 * @param {Date} params.startedAt
 * @param {Array<import('ai').ModelMessage>} params.messages
 * @returns {ReturnType<typeof streamText>}
 */
export function runSessionAgent({ sessionId, userId, taskId: sessionTaskId, taskTitle, firstAction, startedAt, messages }) {
  const systemPrompt = loadPrompt('session-agent', {
    task_title: taskTitle,
    first_action: firstAction,
    started_at: startedAt.toISOString(),
  });

  const callStart = Date.now();

  return streamText({
    model: google(SESSION_MODEL),
    system: systemPrompt,
    messages,
    // Each step is a separate model call. Free-tier Gemini 2.5 Flash allows
    // only ~20 requests/day, so capping at 3 steps (vs 5) stretches the daily
    // budget. Raise this back once the project is on the paid tier.
    stopWhen: stepCountIs(3),
    // Gemini's free tier frequently returns 429 (quota) / 503 (overload). The
    // SDK retries with exponential backoff, which can run past Vercel's 25s
    // initial-response limit and get the function silently killed. Cap retries
    // and hard-abort at 20s so the request fails fast and `onError` returns the
    // "give it another moment" copy instead of a platform timeout.
    maxRetries: 2,
    abortSignal: AbortSignal.timeout(20_000),
    tools: {
      update_task_state: tool({
        description: 'Update the state of the current task.',
        inputSchema: UpdateTaskStateInputSchema,
        execute: async ({ taskId, state }) => {
          // Trust the session-bound task ID, not the model. The agent never
          // sees the real task ID (only the title), so any taskId it supplies
          // is a guess that matches no row — leaving the task stuck as "today".
          const targetId = sessionTaskId ?? taskId;
          if (!targetId) return { ok: false, state, error: 'no task bound to session' };
          /** @type {Partial<import('../db/schema.js').tasks.$inferInsert>} */
          const updates = {};
          if (state === 'started') {
            updates.state = 'in_progress';
          } else if (state === 'done') {
            updates.state = 'done';
            updates.completedAt = new Date();
            updates.isToday = false;
          } else if (state === 'deferred') {
            updates.state = 'deferred';
            updates.isToday = false;
          }
          // 'stuck' keeps DB state as-is; agent should follow up with split_task or log_blocker
          if (Object.keys(updates).length > 0) {
            await updateTask(targetId, userId, updates);
          }
          return { ok: true, state };
        },
      }),

      split_task: tool({
        description: 'Break an overwhelming task into 2–5 smaller concrete steps.',
        inputSchema: SplitTaskInputSchema,
        execute: async ({ taskId, steps }) => {
          await updateTask(taskId, userId, { state: 'deferred', isToday: false });
          const created = await Promise.all(
            steps.map((step, i) =>
              createTask({
                id: randomUUID(),
                userId,
                intentionId: null,
                title: step.title,
                firstAction: step.first_action,
                estimateMinutes: step.estimate_minutes,
                energy: step.energy,
                blockers: [],
                state: i === 0 ? 'today' : 'pending',
                isToday: i === 0,
                order: i,
              })
            )
          );
          // Point the session at the first new sub-task
          if (created[0]) {
            await updateWorkSession(sessionId, userId, { taskId: created[0].id });
          }
          return { ok: true, firstStep: steps[0]?.title, totalSteps: steps.length };
        },
      }),

      set_checkin_timer: tool({
        description: 'Schedule a gentle check-in after N minutes while the user works.',
        inputSchema: SetCheckinTimerInputSchema,
        execute: async ({ minutes, reason }) => {
          // Client reads this tool result and sets a browser timer to send a check-in message
          return { ok: true, minutes, reason };
        },
      }),

      log_blocker: tool({
        description: 'Log a blocker without derailing the session flow.',
        inputSchema: LogBlockerInputSchema,
        execute: async ({ taskId, note }) => {
          const targetId = sessionTaskId ?? taskId;
          await appendSessionEvent({
            id: randomUUID(),
            sessionId,
            eventType: 'tool_call',
            role: null,
            content: null,
            toolName: 'log_blocker',
            toolInput: { taskId: targetId, note },
            toolResult: { logged: true },
          });
          return { ok: true };
        },
      }),

      end_session: tool({
        description: 'End the session with a factual summary and a concrete tomorrow first action.',
        inputSchema: EndSessionInputSchema,
        execute: async ({ summary, tomorrow_first_action }) => {
          await updateWorkSession(sessionId, userId, {
            state: 'ended',
            summary,
            tomorrowFirstAction: tomorrow_first_action,
            endedAt: new Date(),
          });
          return { ok: true, summary, tomorrow_first_action };
        },
      }),

      enter_flow_mode: tool({
        description:
          'User wants to work without interruption. Silences check-ins for the given number of minutes.',
        inputSchema: EnterFlowModeInputSchema,
        execute: async ({ minutes }) => {
          const flowModeUntil = new Date(Date.now() + minutes * 60 * 1000);
          await updateWorkSession(sessionId, userId, { flowModeUntil });
          return { ok: true, minutes, flowModeUntil: flowModeUntil.toISOString() };
        },
      }),
    },

    onError: ({ error }) => {
      const latencyMs = Date.now() - callStart;
      logAgentCall({
        id: randomUUID(),
        userId,
        sessionId,
        agentType: 'session',
        model: SESSION_MODEL,
        promptVersion: SESSION_PROMPT_VERSION,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        latencyMs,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      }).catch((err) => console.error('[telemetry] session:', err));
    },

    onFinish: async ({ text, usage }) => {
      const latencyMs = Date.now() - callStart;
      const tokensIn = usage?.inputTokens ?? 0;
      const tokensOut = usage?.outputTokens ?? 0;

      logAgentCall({
        id: randomUUID(),
        userId,
        sessionId,
        agentType: 'session',
        model: SESSION_MODEL,
        promptVersion: SESSION_PROMPT_VERSION,
        tokensIn,
        tokensOut,
        costUsd: calculateCost(SESSION_MODEL, tokensIn, tokensOut),
        latencyMs,
        success: true,
      }).catch((err) => console.error('[telemetry] session:', err));

      if (text) {
        appendSessionEvent({
          id: randomUUID(),
          sessionId,
          eventType: 'agent_message',
          role: 'assistant',
          content: text,
        }).catch((err) => console.error('[session] persist response:', err));
      }
    },
  });
}
