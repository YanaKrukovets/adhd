// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock before importing the module under test
vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-haiku-model'),
}));

// Prevent telemetry from touching the DB — just run the call and return
vi.mock('@/lib/telemetry.js', () => ({
  withTelemetry: vi.fn(async ({ call }) => call()),
  calculateCost: vi.fn(() => 0),
}));

import { generateObject } from 'ai';
import { runPlanner, callPlanner, PLANNER_PROMPT_VERSION } from '@/lib/agents/planner.js';

const validPlan = {
  clarifying_question: null,
  tasks: [
    {
      title: 'File taxes online',
      first_action: 'Open https://www.canada.ca/en/revenue-agency in Chrome',
      estimate_minutes: 30,
      energy: 'medium',
      blockers: [],
    },
  ],
  suggested_today: [0],
};

const clarifyingPlan = {
  clarifying_question: 'Is this a repair/service issue, or paperwork like registration?',
  tasks: [],
  suggested_today: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PLANNER_PROMPT_VERSION', () => {
  it('exports a semver string', () => {
    expect(PLANNER_PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('callPlanner', () => {
  it('calls generateObject with Haiku model and the plan schema', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: validPlan, usage: { promptTokens: 100, completionTokens: 50 } });

    const result = await callPlanner({ intention: 'I need to file my taxes' });

    expect(generateObject).toHaveBeenCalledOnce();
    const call = vi.mocked(generateObject).mock.calls[0][0];
    expect(call.model).toBe('mock-haiku-model');
    expect(call.prompt).toBe('I need to file my taxes');
    expect(typeof call.system).toBe('string');
    expect(call.system.length).toBeGreaterThan(50);
    expect(result).toEqual(validPlan);
  });

  it('includes clarifying_answer in system prompt when provided', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: validPlan, usage: { promptTokens: 120, completionTokens: 60 } });

    await callPlanner({
      intention: 'deal with my car',
      clarifyingAnswer: 'It needs an oil change.',
    });

    const call = vi.mocked(generateObject).mock.calls[0][0];
    expect(call.system).toContain('oil change');
    expect(call.system).toContain('<clarifying_answer>');
  });

  it('omits clarifying_answer block from prompt when not provided', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: validPlan, usage: { promptTokens: 100, completionTokens: 50 } });

    await callPlanner({ intention: 'I need to file my taxes' });

    const call = vi.mocked(generateObject).mock.calls[0][0];
    expect(call.system).not.toContain('<clarifying_answer>');
  });

  it('interpolates context variables into the system prompt', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: validPlan, usage: { promptTokens: 100, completionTokens: 50 } });

    await callPlanner({
      intention: 'clean my apartment',
      context: { timezone: 'America/Chicago', energy_level: 'low', recent_throughput: 1 },
    });

    const call = vi.mocked(generateObject).mock.calls[0][0];
    expect(call.system).toContain('America/Chicago');
    expect(call.system).toContain('low');
    expect(call.system).toContain('1');
  });

  it('returns clarifying question plan unchanged', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: clarifyingPlan, usage: { promptTokens: 80, completionTokens: 20 } });

    const result = await callPlanner({ intention: 'deal with my car situation' });

    expect(result.clarifying_question).toContain('repair');
    expect(result.tasks).toHaveLength(0);
  });

  it('propagates generateObject errors', async () => {
    vi.mocked(generateObject).mockRejectedValueOnce(new Error('API rate limit'));

    await expect(callPlanner({ intention: 'I need to file my taxes' }))
      .rejects.toThrow('API rate limit');
  });
});

describe('runPlanner', () => {
  it('calls withTelemetry and returns plan object', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: validPlan, usage: { promptTokens: 100, completionTokens: 50 } });

    const result = await runPlanner({
      intention: 'I need to file my taxes',
      userId: 'user-123',
    });

    expect(result).toEqual(validPlan);
  });

  it('uses default context values when none provided', async () => {
    vi.mocked(generateObject).mockResolvedValueOnce({ object: validPlan, usage: { promptTokens: 100, completionTokens: 50 } });

    await runPlanner({ intention: 'I need to file my taxes' });

    const call = vi.mocked(generateObject).mock.calls[0][0];
    expect(call.system).toContain('UTC');
    expect(call.system).toContain('medium');
  });
});
