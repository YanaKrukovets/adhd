// @ts-check

/**
 * Maps a stream/model error to a calm, specific message for the user.
 * Free-tier Gemini fails most often with 429 (daily/per-minute quota) and 503
 * (overload); those should read differently from a generic outage so the user
 * knows whether waiting helps. Copy follows the ADHD tone rules: no shame
 * language, short sentences, reassure that nothing was lost.
 *
 * @param {unknown} error
 * @returns {string}
 */
export function friendlyStreamError(error) {
  const status = /** @type {any} */ (error)?.statusCode ?? /** @type {any} */ (error)?.status;
  const text = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();

  const isQuota =
    status === 429 || text.includes('resource_exhausted') || text.includes('quota');
  if (isQuota) {
    return "We've hit today's free usage limit for the assistant. It resets tomorrow — your task and notes are saved.";
  }

  const isOverloaded =
    status === 503 || text.includes('unavailable') || text.includes('overloaded');
  if (isOverloaded) {
    return 'The assistant is busy right now. Give it a few seconds and send your message again.';
  }

  const isTimeout =
    /** @type {any} */ (error)?.name === 'TimeoutError' ||
    /** @type {any} */ (error)?.name === 'AbortError' ||
    text.includes('aborted') ||
    text.includes('timeout');
  if (isTimeout) {
    return 'That took longer than expected. Try sending your message again.';
  }

  return "Couldn't reach the assistant just now — give it another moment and try again.";
}
