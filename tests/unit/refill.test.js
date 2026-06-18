// @ts-check
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefillResponseSchema } from '@/lib/schemas/api.js';

// --- DB mock -------------------------------------------------------------
// pullNextPendingTasks runs two statements: a select(...).limit(n) that returns
// the next pending rows, and an update(...).where(...) that flips them onto
// today. We mock the chain so we can assert exactly how many rows get moved.
const selectLimit = vi.fn();
const updateWhere = vi.fn(() => Promise.resolve());
const updateSet = vi.fn(() => ({ where: updateWhere }));

vi.mock('@/lib/db/index.js', () => {
  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    orderBy: () => selectChain,
    limit: (n) => selectLimit(n),
  };
  return {
    db: {
      select: () => selectChain,
      update: () => ({ set: updateSet }),
    },
  };
});

const { pullNextPendingTasks, MAX_TODAY_TASKS } = await import('@/lib/db/queries.js');

describe('MAX_TODAY_TASKS', () => {
  it('is locked at 3 (CLAUDE.md hard rule #4 — never raise)', () => {
    expect(MAX_TODAY_TASKS).toBe(3);
  });
});

describe('RefillResponseSchema', () => {
  it('accepts a non-negative integer moved count', () => {
    expect(RefillResponseSchema.parse({ moved: 0 }).moved).toBe(0);
    expect(RefillResponseSchema.parse({ moved: 3 }).moved).toBe(3);
  });

  it('rejects negative or fractional counts', () => {
    expect(() => RefillResponseSchema.parse({ moved: -1 })).toThrow();
    expect(() => RefillResponseSchema.parse({ moved: 1.5 })).toThrow();
  });
});

describe('pullNextPendingTasks', () => {
  beforeEach(() => {
    selectLimit.mockReset();
    updateSet.mockClear();
    updateWhere.mockClear();
  });

  it('is a no-op when there are no free slots (limit <= 0)', async () => {
    const moved = await pullNextPendingTasks('user-1', 0);
    expect(moved).toBe(0);
    // Never touches the DB — no slot, no work.
    expect(selectLimit).not.toHaveBeenCalled();
    expect(updateSet).not.toHaveBeenCalled();
  });

  it('does not query with a negative limit', async () => {
    expect(await pullNextPendingTasks('user-1', -2)).toBe(0);
    expect(selectLimit).not.toHaveBeenCalled();
  });

  it('moves only as many tasks as the free-slot limit allows', async () => {
    // Two free slots requested; two pending rows come back.
    selectLimit.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const moved = await pullNextPendingTasks('user-1', 2);
    expect(selectLimit).toHaveBeenCalledWith(2);
    expect(moved).toBe(2);
    // The matched rows are flipped onto today.
    expect(updateSet).toHaveBeenCalledWith({ isToday: true, state: 'today' });
  });

  it('returns the actual count when fewer pending tasks exist than slots', async () => {
    // One free slot capacity but only the rows the pool returns matter.
    selectLimit.mockResolvedValue([{ id: 'a' }]);
    expect(await pullNextPendingTasks('user-1', 3)).toBe(1);
  });

  it('makes no update when the pending pool is empty', async () => {
    selectLimit.mockResolvedValue([]);
    expect(await pullNextPendingTasks('user-1', 3)).toBe(0);
    expect(updateSet).not.toHaveBeenCalled();
  });
});
