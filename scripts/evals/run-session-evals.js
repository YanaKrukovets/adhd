#!/usr/bin/env node
// @ts-check
'use strict';

/**
 * Session agent eval harness.
 * Replays scripted multi-turn scenarios against the session agent
 * and uses Gemini as a judge to score behavior.
 *
 * Usage: node scripts/evals/run-session-evals.js
 * Requires: GOOGLE_GENERATIVE_AI_API_KEY in env
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const JUDGE_MODEL = 'gemini-2.5-flash';
const RESULTS_DIR = join(process.cwd(), 'scripts/evals/results');

const RUBRIC_DIMENSIONS = [
  'interruption_appropriateness',
  'tone_shame_free',
  'correct_tool_selection',
];

const TARGETS = {
  interruption_appropriateness: 0.80,
  tone_shame_free: 0.90,
  correct_tool_selection: 0.80,
};

/** @type {Array<{id: string, name: string, turns: Array<{role: string, content: string}>}>} */
const SCENARIOS = [
  {
    id: 's001',
    name: 'User goes silent twice after starting',
    turns: [
      { role: 'user', content: 'Ok, starting on the taxes now. Going to open the CRA site.' },
      { role: 'system', content: '[system-checkin: elapsed=10min, last_known_state=started]' },
      { role: 'system', content: '[system-checkin: elapsed=20min, last_known_state=started]' },
    ],
  },
  {
    id: 's002',
    name: 'User says leave me alone then check-in fires',
    turns: [
      { role: 'user', content: "I'm in flow, please don't interrupt me for a while." },
      { role: 'system', content: '[system-checkin: elapsed=15min, last_known_state=in_progress]' },
    ],
  },
  {
    id: 's003',
    name: 'User spirals: this is pointless',
    turns: [
      { role: 'user', content: 'I started but now I feel like what even is the point of this, I always do this' },
    ],
  },
  {
    id: 's004',
    name: 'User says task is actually huge',
    turns: [
      { role: 'user', content: "Wait I opened the tax site and there's like 15 different sections I need to fill. This is way bigger than I thought." },
    ],
  },
  {
    id: 's005',
    name: 'User is waiting on a document',
    turns: [
      { role: 'user', content: "I can't continue, I need my T4 slip and I don't have it yet, my employer hasn't sent it" },
    ],
  },
];

/**
 * @param {object} scenario
 * @param {string} agentResponse
 * @returns {Promise<Record<string, number>>}
 */
async function judgeScenario(scenario, agentResponse) {
  const judgePrompt = `You are evaluating a session agent (body double assistant) for ADHD users.

IMPORTANT: Before scoring each dimension, quote the relevant part of the agent's response. Score each dimension independently — never give a holistic score.

## Scenario: ${scenario.name}
Conversation:
${scenario.turns.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n')}

## Agent's response:
${agentResponse}

## Score each dimension 0, 1, or 2:

1. **interruption_appropriateness** (0-2) — Did the agent handle check-ins and user silence correctly?
   - 0: Interrupted when user said not to, OR failed to check in when appropriate, OR panicked unnecessarily
   - 1: Somewhat appropriate but miscalibrated timing or tone
   - 2: Exactly right — silent when needed, gentle when helpful, escalated correctly when warranted

2. **tone_shame_free** (0-2) — Was the tone calm, non-judgmental, and shame-free?
   - 0: Contains shame language, toxic positivity, or implies the user is failing
   - 1: Mostly okay but one phrase that could land wrong
   - 2: Perfectly calm, concrete, treats user as capable adult

3. **correct_tool_selection** (0-2) — Did the agent call (or clearly indicate it would call) the right tool?
   - 0: Wrong tool or no tool when tool was clearly needed
   - 1: Right tool but wrong parameters, or tool called unnecessarily
   - 2: Exactly the right tool with appropriate parameters (or correctly did not call any tool)

Respond with ONLY valid JSON:
{
  "interruption_appropriateness": { "quote": "...", "reasoning": "...", "score": 0|1|2 },
  "tone_shame_free": { "quote": "...", "reasoning": "...", "score": 0|1|2 },
  "correct_tool_selection": { "quote": "...", "reasoning": "...", "score": 0|1|2 }
}`;

  const { text } = await generateText({
    model: google(JUDGE_MODEL),
    maxOutputTokens: 1024,
    prompt: judgePrompt,
  });

  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    return Object.fromEntries(RUBRIC_DIMENSIONS.map(d => [d, parsed[d]?.score ?? 0]));
  } catch {
    return Object.fromEntries(RUBRIC_DIMENSIONS.map(d => [d, 0]));
  }
}

async function runSessionEvals() {
  console.log('\n=== Focus Copilot — Session Eval Suite ===\n');

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('ERROR: GOOGLE_GENERATIVE_AI_API_KEY is required');
    process.exit(1);
  }

  console.log(`Running ${SCENARIOS.length} scenarios. Judge: ${JUDGE_MODEL}\n`);

  // Phase 0 stub: generate a plausible agent response for judging
  // In Phase 2, replace with real session agent call
  const stubAgentResponse = (scenario) => {
    const stubs = {
      's001': "Still working on those taxes? No pressure — just checking in. How's it going?",
      's002': "[Agent stays silent — user requested no interruptions]",
      's003': "That sounds really frustrating. What part is feeling pointless right now — the task itself, or something else?",
      's004': "Okay, that makes sense — tax forms often have a lot of sections. Want to break it down into smaller pieces so we can tackle one section at a time?",
      's005': "Got it. I'll log that as a blocker — waiting on T4 from employer. Want to move on to something else while you wait, or wrap up for now?",
    };
    return stubs[scenario.id] ?? "I'm here. What do you need?";
  };

  const results = [];
  for (const scenario of SCENARIOS) {
    process.stdout.write(`  ${scenario.id}: "${scenario.name}"... `);
    try {
      const agentResponse = stubAgentResponse(scenario);
      const scores = await judgeScenario(scenario, agentResponse);
      results.push({ id: scenario.id, name: scenario.name, scores });
      const avg = Object.values(scores).reduce((a, b) => a + b, 0) / RUBRIC_DIMENSIONS.length;
      console.log(`avg ${avg.toFixed(2)}/2`);
    } catch (err) {
      console.log('ERROR:', err.message);
      results.push({ id: scenario.id, name: scenario.name, scores: Object.fromEntries(RUBRIC_DIMENSIONS.map(d => [d, 0])) });
    }
  }

  console.log('\n--- Results by Dimension ---\n');
  console.log('Dimension'.padEnd(35) + 'Pass Rate'.padEnd(12) + 'Target'.padEnd(10) + 'Status');
  console.log('-'.repeat(65));

  const dimensionSummary = {};
  for (const dim of RUBRIC_DIMENSIONS) {
    const scores = results.map(r => r.scores[dim] ?? 0);
    const passRate = scores.filter(s => s >= 1.5).length / scores.length;
    const target = TARGETS[dim];
    const status = passRate >= target ? '✓ PASS' : '✗ FAIL';
    dimensionSummary[dim] = { passRate, target, status };
    console.log(dim.padEnd(35) + `${(passRate * 100).toFixed(0)}%`.padEnd(12) + `${(target * 100).toFixed(0)}%`.padEnd(10) + status);
  }

  mkdirSync(RESULTS_DIR, { recursive: true });
  const output = { timestamp: new Date().toISOString(), model: JUDGE_MODEL, scenarioCount: SCENARIOS.length, dimensions: dimensionSummary, perScenario: results };
  writeFileSync(join(RESULTS_DIR, 'session-latest.json'), JSON.stringify(output, null, 2));
  console.log('\nResults written to scripts/evals/results/session-latest.json');

  const anyFail = Object.values(dimensionSummary).some(d => d.status === '✗ FAIL');
  console.log(anyFail ? '\n⚠️  Some dimensions below target.' : '\n✅  All dimensions at or above target.');
  process.exit(anyFail ? 1 : 0);
}

runSessionEvals();
