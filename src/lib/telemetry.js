// @ts-check
import { randomUUID } from 'crypto';
import { logAgentCall } from './db/queries.js';

/**
 * Cost per million tokens (USD), by model.
 * Update when Anthropic changes pricing.
 * @type {Record<string, {input: number, output: number}>}
 */
const MODEL_COSTS = {
  'claude-haiku-4-5-20251001':  { input: 0.80,  output: 4.00  },
  'claude-sonnet-4-6':          { input: 3.00,  output: 15.00 },
  'claude-opus-4-8':            { input: 15.00, output: 75.00 },
};

/**
 * @param {string} model
 * @param {number} tokensIn
 * @param {number} tokensOut
 * @returns {number} cost in USD
 */
export function calculateCost(model, tokensIn, tokensOut) {
  const rates = MODEL_COSTS[model] ?? { input: 3.00, output: 15.00 };
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
