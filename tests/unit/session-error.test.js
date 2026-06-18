// @ts-check
import { describe, it, expect } from 'vitest';
import { friendlyStreamError } from '@/lib/session-error.js';

describe('friendlyStreamError', () => {
  it('explains the daily free-tier limit on a 429 quota error', () => {
    const msg = friendlyStreamError({ statusCode: 429, message: 'RESOURCE_EXHAUSTED: quota' });
    expect(msg).toContain('free usage limit');
    expect(msg).toContain('resets tomorrow');
  });

  it('matches quota by message when no status code is present', () => {
    const msg = friendlyStreamError(new Error('You exceeded your current quota'));
    expect(msg).toContain('free usage limit');
  });

  it('flags a missing API key as a setup problem', () => {
    const msg = friendlyStreamError({
      name: 'AI_LoadAPIKeyError',
      message: 'Google Generative AI API key is missing.',
    });
    expect(msg).toContain("isn't set up correctly");
    expect(msg).toContain('GOOGLE_GENERATIVE_AI_API_KEY');
  });

  it('flags an invalid API key (400) as a setup problem', () => {
    const msg = friendlyStreamError({ statusCode: 400, message: 'API key not valid.' });
    expect(msg).toContain("isn't set up correctly");
  });

  it('unwraps a RetryError to find the underlying quota cause', () => {
    const msg = friendlyStreamError({
      name: 'AI_RetryError',
      message: 'Failed after 3 attempts.',
      lastError: { statusCode: 429, message: 'RESOURCE_EXHAUSTED' },
    });
    expect(msg).toContain('free usage limit');
  });

  it('tells the user to wait briefly on a 503 overload', () => {
    const msg = friendlyStreamError({ statusCode: 503, message: 'model is UNAVAILABLE' });
    expect(msg).toContain('busy');
  });

  it('reports a timeout/abort distinctly', () => {
    const err = new Error('The operation was aborted');
    err.name = 'TimeoutError';
    expect(friendlyStreamError(err)).toContain('longer than expected');
  });

  it('falls back to the generic message for unknown errors', () => {
    expect(friendlyStreamError(new Error('boom'))).toContain("Couldn't reach the assistant");
  });

  it('never uses shame language', () => {
    const forbidden = ['overdue', 'failed', 'missed', 'behind', 'late', 'should have', "didn't"];
    const messages = [
      friendlyStreamError({ statusCode: 429 }),
      friendlyStreamError({ statusCode: 503 }),
      friendlyStreamError(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      friendlyStreamError(new Error('boom')),
    ];
    for (const m of messages) {
      for (const word of forbidden) {
        expect(m.toLowerCase()).not.toContain(word);
      }
    }
  });
});
