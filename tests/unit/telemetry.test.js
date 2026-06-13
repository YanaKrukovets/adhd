// @ts-check
import { describe, it, expect } from 'vitest';
import { calculateCost } from '@/lib/telemetry.js';

describe('calculateCost', () => {
  it('calculates Haiku costs correctly', () => {
    const cost = calculateCost('claude-haiku-4-5-20251001', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.80 + 4.00, 5);
  });

  it('calculates Sonnet costs correctly', () => {
    const cost = calculateCost('claude-sonnet-4-6', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(3.00 + 15.00, 5);
  });

  it('falls back to Sonnet pricing for unknown models', () => {
    const known = calculateCost('claude-sonnet-4-6', 500_000, 200_000);
    const unknown = calculateCost('some-future-model', 500_000, 200_000);
    expect(unknown).toBeCloseTo(known, 5);
  });

  it('returns 0 for zero tokens', () => {
    expect(calculateCost('claude-haiku-4-5-20251001', 0, 0)).toBe(0);
  });

  it('input cost is lower per token than output cost', () => {
    const inputOnlyCost = calculateCost('claude-sonnet-4-6', 1_000_000, 0);
    const outputOnlyCost = calculateCost('claude-sonnet-4-6', 0, 1_000_000);
    expect(outputOnlyCost).toBeGreaterThan(inputOnlyCost);
  });
});
