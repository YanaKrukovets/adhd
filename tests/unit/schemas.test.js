// @ts-check
import { describe, it, expect } from 'vitest';
import { PlanSchema, TaskSchema } from '@/lib/schemas/plan.js';
import { TaskStateSchema, UpdateTaskStateInputSchema, SetCheckinTimerInputSchema, SplitTaskInputSchema } from '@/lib/schemas/session.js';
import { PlanRequestSchema } from '@/lib/schemas/api.js';

describe('PlanSchema', () => {
  const validTask = {
    title: 'File taxes',
    first_action: 'Open https://www.canada.ca/en/revenue-agency in Chrome',
    estimate_minutes: 30,
    energy: 'medium',
    blockers: [],
  };

  it('accepts a valid plan with clarifying question', () => {
    const result = PlanSchema.parse({
      clarifying_question: 'Is this for personal or business taxes?',
      tasks: [],
      suggested_today: [],
    });
    expect(result.clarifying_question).toBe('Is this for personal or business taxes?');
    expect(result.tasks).toHaveLength(0);
  });

  it('accepts a valid plan without clarifying question', () => {
    const result = PlanSchema.parse({
      clarifying_question: null,
      tasks: [validTask],
      suggested_today: [0],
    });
    expect(result.clarifying_question).toBeNull();
    expect(result.tasks).toHaveLength(1);
  });

  it('rejects suggested_today with more than 3 items', () => {
    expect(() => PlanSchema.parse({
      clarifying_question: null,
      tasks: [validTask, validTask, validTask, validTask],
      suggested_today: [0, 1, 2, 3],
    })).toThrow();
  });

  it('accepts suggested_today with exactly 3 items', () => {
    const plan = PlanSchema.parse({
      clarifying_question: null,
      tasks: [validTask, validTask, validTask],
      suggested_today: [0, 1, 2],
    });
    expect(plan.suggested_today).toHaveLength(3);
  });

  it('rejects tasks array with more than 12 items', () => {
    const tooMany = Array(13).fill(validTask);
    expect(() => PlanSchema.parse({
      clarifying_question: null,
      tasks: tooMany,
      suggested_today: [],
    })).toThrow();
  });
});

describe('TaskSchema', () => {
  it('rejects estimate_minutes below 2', () => {
    expect(() => TaskSchema.parse({
      title: 'Test',
      first_action: 'Do thing',
      estimate_minutes: 1,
      energy: 'low',
    })).toThrow();
  });

  it('rejects estimate_minutes above 240', () => {
    expect(() => TaskSchema.parse({
      title: 'Test',
      first_action: 'Do thing',
      estimate_minutes: 241,
      energy: 'low',
    })).toThrow();
  });

  it('accepts estimate_minutes at boundaries 2 and 240', () => {
    expect(() => TaskSchema.parse({ title: 'T', first_action: 'A', estimate_minutes: 2, energy: 'low' })).not.toThrow();
    expect(() => TaskSchema.parse({ title: 'T', first_action: 'A', estimate_minutes: 240, energy: 'low' })).not.toThrow();
  });

  it('rejects energy values outside enum', () => {
    expect(() => TaskSchema.parse({
      title: 'Test',
      first_action: 'Do thing',
      estimate_minutes: 10,
      energy: 'extreme',
    })).toThrow();
  });

  it('rejects first_action longer than 120 chars', () => {
    expect(() => TaskSchema.parse({
      title: 'Test',
      first_action: 'A'.repeat(121),
      estimate_minutes: 10,
      energy: 'low',
    })).toThrow();
  });

  it('accepts first_action at exactly 120 chars', () => {
    expect(() => TaskSchema.parse({
      title: 'Test',
      first_action: 'A'.repeat(120),
      estimate_minutes: 10,
      energy: 'low',
    })).not.toThrow();
  });

  it('rejects title longer than 80 chars', () => {
    expect(() => TaskSchema.parse({
      title: 'A'.repeat(81),
      first_action: 'Do thing',
      estimate_minutes: 10,
      energy: 'low',
    })).toThrow();
  });
});

describe('TaskStateSchema — overdue must be rejected', () => {
  it('rejects "overdue" as a task state', () => {
    expect(() => TaskStateSchema.parse('overdue')).toThrow();
  });

  it('accepts all valid states', () => {
    for (const state of ['pending', 'today', 'in_progress', 'done', 'deferred']) {
      expect(() => TaskStateSchema.parse(state)).not.toThrow();
    }
  });
});

describe('UpdateTaskStateInputSchema', () => {
  it('rejects missing taskId', () => {
    expect(() => UpdateTaskStateInputSchema.parse({ state: 'done' })).toThrow();
  });

  it('rejects "overdue" state', () => {
    expect(() => UpdateTaskStateInputSchema.parse({ taskId: 'abc', state: 'overdue' })).toThrow();
  });

  it('accepts started state', () => {
    const result = UpdateTaskStateInputSchema.parse({ taskId: 'task-1', state: 'started' });
    expect(result.state).toBe('started');
  });

  it('accepts done state', () => {
    const result = UpdateTaskStateInputSchema.parse({ taskId: 'task-1', state: 'done' });
    expect(result.state).toBe('done');
  });
});

describe('SetCheckinTimerInputSchema', () => {
  it('rejects minutes below 1', () => {
    expect(() => SetCheckinTimerInputSchema.parse({ minutes: 0, reason: 'test' })).toThrow();
  });

  it('rejects minutes above 120', () => {
    expect(() => SetCheckinTimerInputSchema.parse({ minutes: 121, reason: 'test' })).toThrow();
  });

  it('accepts valid timer', () => {
    const result = SetCheckinTimerInputSchema.parse({ minutes: 10, reason: 'Starting subtask 2' });
    expect(result.minutes).toBe(10);
  });
});

describe('SplitTaskInputSchema', () => {
  const validStep = { title: 'Step 1', first_action: 'Do the first thing', estimate_minutes: 5, energy: 'low' };

  it('requires at least 2 steps', () => {
    expect(() => SplitTaskInputSchema.parse({ taskId: 'task-1', steps: [validStep] })).toThrow();
  });

  it('rejects more than 6 steps', () => {
    expect(() => SplitTaskInputSchema.parse({ taskId: 'task-1', steps: Array(7).fill(validStep) })).toThrow();
  });

  it('accepts 2–6 steps', () => {
    for (const n of [2, 3, 6]) {
      expect(() => SplitTaskInputSchema.parse({ taskId: 'task-1', steps: Array(n).fill(validStep) })).not.toThrow();
    }
  });
});

describe('PlanRequestSchema', () => {
  it('rejects empty intention', () => {
    expect(() => PlanRequestSchema.parse({ intention: '' })).toThrow();
  });

  it('rejects intention longer than 2000 chars', () => {
    expect(() => PlanRequestSchema.parse({ intention: 'A'.repeat(2001) })).toThrow();
  });

  it('accepts a valid intention', () => {
    const result = PlanRequestSchema.parse({ intention: 'I need to file my taxes' });
    expect(result.intention).toBe('I need to file my taxes');
  });
});
