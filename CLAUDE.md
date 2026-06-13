# Focus Copilot

Agentic executive-function assistant for adults with ADHD. JavaScript (NOT TypeScript), Next.js 15 App Router, Vercel AI SDK v5, Drizzle + Postgres, Vitest + Playwright.

## Commands
- `npm run dev` — dev server
- `npm run lint` / `npm run format` — ESLint flat config / Prettier
- `npm test` — Vitest unit tests
- `npm run test:e2e` — Playwright
- `npm run evals:planner` / `npm run evals:session` — eval harnesses (require ANTHROPIC_API_KEY)
- `npm run db:generate` / `npm run db:migrate` — Drizzle

## Hard rules
1. JavaScript only. Every file starts with `// @ts-check`. JSDoc on all exports. NEVER create .ts/.tsx files.
2. ALL external data (LLM output, request bodies, env) is validated with Zod from `src/lib/schemas/`. Never trust raw LLM JSON.
3. There is NO "overdue" task state. Never add one — not in schema, not in UI copy, not in queries. Unfinished work rolls forward silently.
4. Daily plan shows MAXIMUM 3 tasks. Hard cap, enforced in schema (`suggested_today.max(3)`).
5. First actions must be concrete and ≤5 minutes. The planner eval enforces this; don't weaken the rubric.
6. No countdown timers in UI. Elapsed-time indicators only.
7. Prompts live in `src/lib/prompts/*.md` and are loaded at runtime. NEVER inline a system prompt in code. Every prompt edit requires: bump version constant, add CHANGELOG.md entry, run the matching eval suite, paste before/after scores in the changelog entry.
8. Every LLM call goes through `src/lib/telemetry.js` wrapper (logs model, tokens, cost, latency, prompt_version to agent_calls).
9. Session agent = Sonnet. Planner + eval judges = Haiku. Don't change model routing without updating cost projections in README.
10. Copy/tone: never use shame language ("overdue", "you failed to", "missed", streak-breaking). Voice is a calm friend, not a coach.

## Conventions
- Commit format: `feat|fix|chore|test|eval(scope): description`
- Server components by default; `'use client'` only where interaction demands it.
- DB access only via `src/lib/db/queries.js` — no inline SQL in routes.
- New feature = code + unit tests + (if user-facing) Playwright test + (if touches prompts) eval run. Use /feature skill.
