// @ts-check
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { PlanSchema } from '../schemas/plan.js';
import { loadPrompt } from '../prompts/load.js';
import { withTelemetry } from '../telemetry.js';

const PLANNER_MODEL = 'gemini-3.1-flash-lite';
export const PLANNER_PROMPT_VERSION = '1.1.0';

/**
 * Core planner call — AI SDK only, no telemetry or DB.
 * Suitable for use in eval harnesses that don't have a DB connection.
 *
 * @param {object} params
 * @param {string} params.intention
 * @param {string} [params.clarifyingAnswer]
 * @param {{ timezone?: string, energy_level?: string, recent_throughput?: number }} [params.context]
 * @returns {Promise<import('../schemas/plan.js').Plan>}
 */
export async function callPlanner({ intention, clarifyingAnswer, context }) {
  const systemPrompt = loadPrompt('planner', {
    timezone: context?.timezone ?? 'UTC',
    energy_preference: context?.energy_level ?? 'medium',
    recent_throughput: String(context?.recent_throughput ?? 2),
    intention,
    clarifying_answer: clarifyingAnswer ?? '',
  });

  const result = await generateObject({
    model: google(PLANNER_MODEL),
    schema: PlanSchema,
    system: systemPrompt,
    prompt: intention,
  });

  return result.object;
}

/**
 * Runs the planner agent with telemetry logging.
 *
 * @param {object} params
 * @param {string} params.intention
 * @param {string} [params.clarifyingAnswer]
 * @param {{ timezone?: string, energy_level?: string, recent_throughput?: number }} [params.context]
 * @param {string} [params.userId]
 * @returns {Promise<import('../schemas/plan.js').Plan>}
 */
export async function runPlanner({ intention, clarifyingAnswer, context, userId }) {
  const systemPrompt = loadPrompt('planner', {
    timezone: context?.timezone ?? 'UTC',
    energy_preference: context?.energy_level ?? 'medium',
    recent_throughput: String(context?.recent_throughput ?? 2),
    intention,
    clarifying_answer: clarifyingAnswer ?? '',
  });

  const result = await withTelemetry({
    agentType: 'planner',
    model: PLANNER_MODEL,
    promptVersion: PLANNER_PROMPT_VERSION,
    userId,
    call: () => generateObject({
      model: google(PLANNER_MODEL),
      schema: PlanSchema,
      system: systemPrompt,
      prompt: intention,
    }),
    extractUsage: (r) => ({
      tokensIn: r.usage.inputTokens,
      tokensOut: r.usage.outputTokens,
    }),
  });

  return result.object;
}
