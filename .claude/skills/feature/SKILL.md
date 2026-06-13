---
description: Build a new feature end-to-end. Use whenever the user asks to add/implement functionality.
---

# /feature — Feature Development Workflow

## Steps (execute in order, do not skip)

### 1. Principle check
Before writing any code, restate the feature and verify it against every rule in CLAUDE.md:
- Does it introduce an "overdue" state, shame language, or countdown timer? → STOP and report the conflict.
- Does it show >3 tasks on the today view? → STOP.
- Does it add a ceremony step before the user gets value? → Flag it.
- Does it require a .ts/.tsx file? → STOP. JS only.

If any principle is violated, describe the conflict and propose an alternative. Do not proceed until the user confirms.

### 2. Plan files to touch
List: schemas to add/change, API routes, components, DB queries, prompt files (if any), tests to write.

### 3. Write Zod schemas first
All new data shapes go in `src/lib/schemas/` before any implementation. This is the contract.

### 4. Implement
- `// @ts-check` + JSDoc on every new exported function.
- DB access via `src/lib/db/queries.js` only.
- LLM calls via `src/lib/telemetry.js` wrapper.
- Prompts in `src/lib/prompts/*.md` — never inline. If prompts change, use `/prompt-change`.
- `'use client'` only where DOM interaction requires it.

### 5. Invoke test-writer subagent
Spawn the `test-writer` subagent to write Vitest unit tests and Playwright e2e tests. Pass it the list of new/changed files.

### 6. Invoke code-reviewer subagent
Spawn the `code-reviewer` subagent on the diff. Resolve ALL blocking issues before continuing.

### 7. Invoke ux-empathy-reviewer subagent (user-facing changes only)
Run `ux-empathy-reviewer` on any new UI copy or flows.

### 8. Run `/adhd-ux` checklist (auto-applied on UI changes)
Verify: no shame language, ≤3 choices per screen, no added ceremony, no countdown.

### 9. Verify green
```
npm run lint && npm test
```
Both must pass. If not, fix before reporting complete.

### 10. Summarize
State: what was built, what was explicitly NOT built (scope boundary), and what the next logical step would be.
