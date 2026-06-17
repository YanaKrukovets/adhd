#!/usr/bin/env node
// @ts-check
'use strict';

/**
 * Planner eval harness.
 * Runs each intention fixture through the planner agent,
 * then uses Gemini as an LLM judge to score each rubric dimension.
 *
 * Usage: node scripts/evals/run-planner-evals.js
 * Requires: GOOGLE_GENERATIVE_AI_API_KEY in env
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { callPlanner } from '../../src/lib/agents/planner.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const JUDGE_MODEL = 'gemini-2.5-flash';

const FIXTURES_PATH = join(__dirname, 'fixtures/intentions.json');
const RESULTS_DIR = join(__dirname, 'results');

/** @type {string[]} */
const RUBRIC_DIMENSIONS = [
  'first_action_concrete',
  'first_action_lte_5min',
  'dependency_order',
  'no_hallucinated_prerequisites',
  'clarifying_question_discipline',
];

const TARGETS = {
  first_action_concrete: 0.80,
  first_action_lte_5min: 0.80,
  dependency_order: 0.85,
  no_hallucinated_prerequisites: 0.90,
  clarifying_question_discipline: 0.80,
};

/**
 * @param {object} fixture
 * @param {string} plannerOutput - stringified plan JSON
 * @returns {Promise<Record<string, number>>}
 */
async function judgeOutput(fixture, plannerOutput) {
  const judgePrompt = `You are an evaluator for an ADHD task-planning assistant.

IMPORTANT: Before scoring each dimension, quote the relevant part of the output that informs your score. Never give a holistic score — score each dimension independently.

## The user's intention
"${fixture.input}"

## The planner's output
${plannerOutput}

## Score each dimension 0, 1, or 2:

1. **first_action_concrete** (0-2)
   - 0: First action is vague ("look into", "research", "think about")
   - 1: Somewhat concrete but missing specifics (names, URLs, file paths)
   - 2: Specific physical action with named app/URL/document/person
   For each task, quote the first_action, then give a score.

2. **first_action_lte_5min** (0-2)
   - 0: Clearly impossible in 5 minutes
   - 1: Borderline (might take 10-15 min)
   - 2: Clearly completable in ≤5 minutes
   Score the HARDEST task's first action (worst case).

3. **dependency_order** (0-2)
   - 0: Tasks are clearly misordered (B requires A but comes before A)
   - 1: Mostly ordered but one questionable sequence
   - 2: All prerequisites come before dependent tasks
   
4. **no_hallucinated_prerequisites** (0-2)
   - 0: Assumes existence of documents/accounts/tools the user didn't mention
   - 1: One minor assumption
   - 2: No hallucinated prerequisites
   
5. **clarifying_question_discipline** (0-2)
   - 0: Asked a question when intent was clear enough to plan
   - 1: Question somewhat useful but plan could have been produced
   - 2: Either asked exactly one necessary question OR correctly produced a plan without asking

Respond with ONLY valid JSON in this format:
{
  "first_action_concrete": { "quote": "...", "reasoning": "...", "score": 0|1|2 },
  "first_action_lte_5min": { "quote": "...", "reasoning": "...", "score": 0|1|2 },
  "dependency_order": { "quote": "...", "reasoning": "...", "score": 0|1|2 },
  "no_hallucinated_prerequisites": { "quote": "...", "reasoning": "...", "score": 0|1|2 },
  "clarifying_question_discipline": { "quote": "...", "reasoning": "...", "score": 0|1|2 }
}`;

  const { text } = await generateText({
    model: google(JUDGE_MODEL),
    maxOutputTokens: 1024,
    prompt: judgePrompt,
  });

  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    /** @type {Record<string, number>} */
    const scores = {};
    for (const dim of RUBRIC_DIMENSIONS) {
      scores[dim] = parsed[dim]?.score ?? 0;
    }
    return scores;
  } catch {
    console.error('[judge] Failed to parse judge response:', text.slice(0, 200));
    return Object.fromEntries(RUBRIC_DIMENSIONS.map(d => [d, 0]));
  }
}

async function runPlannerEvals() {
  console.log('\n=== Focus Copilot — Planner Eval Suite ===\n');

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('ERROR: GOOGLE_GENERATIVE_AI_API_KEY is required');
    process.exit(1);
  }

  const fixtures = JSON.parse(readFileSync(FIXTURES_PATH, 'utf-8'));
  console.log(`Running ${fixtures.length} fixtures against judge model: ${JUDGE_MODEL}\n`);

  /** @type {Array<{id: string, scores: Record<string, number>}>} */
  const results = [];

  for (const fixture of fixtures) {
    process.stdout.write(`  Fixture ${fixture.id}: "${fixture.input.slice(0, 50)}"... `);
    try {
      const plan = await callPlanner({
        intention: fixture.input,
        context: {
          timezone: fixture.context?.timezone,
          energy_level: fixture.context?.energy_preference,
          recent_throughput: fixture.context?.recent_throughput,
        },
      });
      const plannerOutput = JSON.stringify(plan);
      const scores = await judgeOutput(fixture, plannerOutput);
      results.push({ id: fixture.id, scores });
      const avg = Object.values(scores).reduce((a, b) => a + b, 0) / RUBRIC_DIMENSIONS.length;
      console.log(`avg ${avg.toFixed(2)}/2`);
    } catch (err) {
      console.log('ERROR:', err.message);
      results.push({ id: fixture.id, scores: Object.fromEntries(RUBRIC_DIMENSIONS.map(d => [d, 0])) });
    }
  }

  // Aggregate by dimension
  console.log('\n--- Results by Dimension ---\n');
  console.log('Dimension'.padEnd(35) + 'Pass Rate'.padEnd(12) + 'Target'.padEnd(10) + 'Status');
  console.log('-'.repeat(65));

  const dimensionSummary = {};
  for (const dim of RUBRIC_DIMENSIONS) {
    const scores = results.map(r => r.scores[dim] ?? 0);
    const passRate = scores.filter(s => s >= 1.5).length / scores.length; // >=1.5/2 = pass
    const target = TARGETS[dim];
    const status = passRate >= target ? '✓ PASS' : '✗ FAIL';
    dimensionSummary[dim] = { passRate, target, status };
    console.log(dim.padEnd(35) + `${(passRate * 100).toFixed(0)}%`.padEnd(12) + `${(target * 100).toFixed(0)}%`.padEnd(10) + status);
  }

  // Write JSON results
  mkdirSync(RESULTS_DIR, { recursive: true });
  const output = {
    timestamp: new Date().toISOString(),
    model: JUDGE_MODEL,
    fixtureCount: fixtures.length,
    dimensions: dimensionSummary,
    perFixture: results,
  };
  const outPath = join(RESULTS_DIR, 'planner-latest.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nResults written to ${outPath}`);

  const anyFail = Object.values(dimensionSummary).some(d => d.status === '✗ FAIL');
  console.log(anyFail ? '\n⚠️  Some dimensions below target.' : '\n✅  All dimensions at or above target.');
  process.exit(anyFail ? 1 : 0);
}

runPlannerEvals();
