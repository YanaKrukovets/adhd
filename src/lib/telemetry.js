// @ts-check
import { randomUUID } from 'crypto';
import { logAgentCall } from './db/queries.js';

/**
 * Cost per million tokens (USD), by model.
 * Gemini models are on the free tier — $0 within the free quota.
 * Update when Google changes pricing or you move to a paid tier.
 * @type {Record<string, {input: number, output: number}>}
 */
const MODEL_COSTS = {
  'gemini-3.1-flash-lite': { input: 0, output: 0 },
  'gemini-2.5-flash':      { input: 0, output: 0 },
  'gemini-2.5-flash-lite': { input: 0, output: 0 },
  'gemini-2.0-flash':      { input: 0, output: 0 },
};

/**
 * @param {string} model
 * @param {number} tokensIn
 * @param {number} tokensOut
 * @returns {number} cost in USD
 */
export function calculateCost(model, tokensIn, tokensOut) {
  const rates = MODEL_COSTS[model] ?? { input: 0, output: 0 };
  return (tokensIn / 1_000_000) * rates.input + (tokensOut / 1_000_000) * rates.output;
}

/**
 * Wraps an LLM call, measuring latency and logging cost to agent_calls table.
 *
 * @template T
 * @param {object} params
 * @param {string} params.agentType - 'planner' | 'session' | 'eval_judge'
 * @param {string} params.model
 * @param {string} params.promptVersion
 * @param {string} [params.userId]
 * @param {string} [params.sessionId]
 * @param {() => Promise<T>} params.call - the actual AI SDK call
 * @param {(result: T) => {tokensIn: number, tokensOut: number}} params.extractUsage
 * @returns {Promise<T>}
 */
export async function withTelemetry({ agentType, model, promptVersion, userId, sessionId, call, extractUsage }) {
  const id = randomUUID();
  const start = Date.now();
  let success = true;
  let errorMessage;
  let result;

  try {
    result = await call();
  } catch (err) {
    success = false;
    errorMessage = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const latencyMs = Date.now() - start;
    let tokensIn = 0;
    let tokensOut = 0;
    let costUsd = 0;

    if (result && success) {
      try {
        const usage = extractUsage(/** @type {T} */ (result));
        tokensIn = usage.tokensIn;
        tokensOut = usage.tokensOut;
        costUsd = calculateCost(model, tokensIn, tokensOut);
      } catch {
        // usage extraction is best-effort
      }
    }

    // Fire-and-forget — don't block the response on logging
    logAgentCall({ id, userId, sessionId, agentType, model, promptVersion, tokensIn, tokensOut, costUsd, latencyMs, success, errorMessage })
      .catch((err) => console.error('[telemetry] Failed to log agent call:', err));
  }

  return /** @type {T} */ (result);
}
