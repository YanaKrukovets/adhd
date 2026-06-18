// @ts-check
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { randomUUID } from 'crypto';
import { loadPrompt } from '../prompts/load.js';
import { calculateCost } from '../telemetry.js';
import { logAgentCall } from '../db/queries.js';

export const CALM_MODEL = 'gemini-3.1-flash-lite';
export const CALM_PROMPT_VERSION = '1.0.0';

/**
 * Runs the Calm Companion agent and returns a streamText result ready for
 * toUIMessageStreamResponse(). Unlike the session agent this is stateless:
 * there is no work session, no task binding, and no tools — it is a plain
 * grounding conversation. Telemetry is logged with agentType 'calm' so its
 * cost/usage is bucketed separately from planner/session.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {Array<import('ai').ModelMessage>} params.messages
 * @returns {ReturnType<typeof streamText>}
 */
export function runCalmAgent({ userId, messages }) {
  const systemPrompt = loadPrompt('calm-companion');
  const callStart = Date.now();

  return streamText({
    model: google(CALM_MODEL),
    system: systemPrompt,
    messages,
    // Same free-tier guards as the session agent: cap retries and hard-abort
    // before Vercel's 25s initial-response limit so a quota/overload failure
    // surfaces friendly copy instead of a silent platform timeout.
    maxRetries: 2,
    abortSignal: AbortSignal.timeout(20_000),

    onError: ({ error }) => {
      const latencyMs = Date.now() - callStart;
      logAgentCall({
        id: randomUUID(),
        userId,
        sessionId: undefined,
        agentType: 'calm',
        model: CALM_MODEL,
        promptVersion: CALM_PROMPT_VERSION,
        tokensIn: 0,
        tokensOut: 0,
        costUsd: 0,
        latencyMs,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
      }).catch((err) => console.error('[telemetry] calm:', err));
    },

    onFinish: ({ usage }) => {
      const latencyMs = Date.now() - callStart;
      const tokensIn = usage?.inputTokens ?? 0;
      const tokensOut = usage?.outputTokens ?? 0;

      logAgentCall({
        id: randomUUID(),
        userId,
        sessionId: undefined,
        agentType: 'calm',
        model: CALM_MODEL,
        promptVersion: CALM_PROMPT_VERSION,
        tokensIn,
        tokensOut,
        costUsd: calculateCost(CALM_MODEL, tokensIn, tokensOut),
        latencyMs,
        success: true,
      }).catch((err) => console.error('[telemetry] calm:', err));
    },
  });
}
