// @ts-check
import { describe, it, expect } from 'vitest';
import { calculateCost } from '@/lib/telemetry.js';

describe('calculateCost', () => {
  it('returns 0 for the free-tier flash model', () => {
    const cost = calculateCost('gemini-2.5-flash', 1_000_000, 1_000_000);
    expect(cost).toBe(0);
  });

  it('returns 0 for the free-tier flash-lite model', () => {
    const cost = calculateCost('gemini-2.5-flash-lite', 1_000_000, 1_000_000);
    expect(cost).toBe(0);
  });

  it('falls back to free pricing for unknown models', () => {
    expect(calculateCost('some-future-model', 500_000, 200_000)).toBe(0);
  });

  it('returns 0 for zero tokens', () => {
    expect(calculateCost('gemini-2.5-flash', 0, 0)).toBe(0);
  });
});
