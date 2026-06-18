// @ts-check
import { describe, it, expect } from 'vitest';
import { CalmRequestSchema } from '@/lib/schemas/calm.js';
import { loadPrompt } from '@/lib/prompts/load.js';
import { CALM_PROMPT_VERSION } from '@/lib/agents/calm.js';

const validMessage = { role: 'user', parts: [{ type: 'text', text: 'I feel overwhelmed' }] };

describe('CalmRequestSchema', () => {
  it('accepts a minimal valid conversation', () => {
    const result = CalmRequestSchema.parse({ messages: [validMessage] });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
  });

  it('rejects an empty messages array', () => {
    expect(() => CalmRequestSchema.parse({ messages: [] })).toThrow();
  });

  it('rejects more than 100 messages (runaway transcript guard)', () => {
    const tooMany = Array(101).fill(validMessage);
    expect(() => CalmRequestSchema.parse({ messages: tooMany })).toThrow();
  });

  it('rejects an invalid role', () => {
    expect(() =>
      CalmRequestSchema.parse({ messages: [{ role: 'robot', parts: [] }] })
    ).toThrow();
  });

  it('defaults parts to an empty array when omitted', () => {
    const result = CalmRequestSchema.parse({ messages: [{ role: 'assistant' }] });
    expect(result.messages[0].parts).toEqual([]);
  });

  it('passes through extra SDK fields on parts without dropping them', () => {
    const result = CalmRequestSchema.parse({
      messages: [{ role: 'user', parts: [{ type: 'text', text: 'hi', state: 'done' }] }],
    });
    expect(/** @type {any} */ (result.messages[0].parts[0]).state).toBe('done');
  });
});

describe('calm-companion prompt', () => {
  const prompt = loadPrompt('calm-companion');

  it('loads and strips the version header', () => {
    expect(prompt).not.toContain('<!-- version');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('matches the agent prompt version constant', () => {
    expect(CALM_PROMPT_VERSION).toBe('1.0.0');
  });

  it('contains the crisis safety boundary (988 handoff)', () => {
    expect(prompt).toContain('988');
  });

  it('never introduces an "overdue" concept (CLAUDE.md rule 3)', () => {
    expect(prompt.toLowerCase()).not.toContain('overdue');
  });

  it('instructs the agent to validate before advising', () => {
    expect(prompt.toLowerCase()).toContain('validate first');
  });
});
