---
description: Full release checklist before merging to main / deploying. Use before every deploy.
---

# /ship-check — Pre-Deploy Gate

This skill is the CI culture. Every item is PASS/FAIL. A single FAIL blocks the deploy.

## Checklist

### 1. Lint
```
npm run lint
```
PASS = zero errors.

### 2. Unit tests
```
npm test
```
PASS = all green, no skips without documented reason.

### 3. E2E tests
```
npm run test:e2e
```
PASS = all green including shame-audit test.

### 4. Eval suites
Invoke `/eval-run both`. PASS = all dimensions at or above targets; no golden-set drift.

### 5. Bundle secret check
```
grep -r "GOOGLE_GENERATIVE_AI_API_KEY\|DATABASE_URL\|AUTH_SECRET" .next/ 2>/dev/null || echo "clean"
```
PASS = no secrets in client bundle.

### 6. Agent cost dashboard check
Start the dev server, navigate to `/admin/evals`. PASS = page renders without errors.

### 7. Security review
Invoke the `security-reviewer` subagent on the git diff since last tag:
```
git diff $(git describe --tags --abbrev=0)..HEAD
```
PASS = no blocking security issues (authz gaps, injection surfaces, unprotected cron).

## Output
Render a PASS/FAIL table:
| Check | Status | Notes |
|---|---|---|
| Lint | ✓ PASS | |
| Unit tests | ✓ PASS | 47 tests |
| E2E tests | ✗ FAIL | shame-audit: "overdue" found in /app/history |
| ...

If ANY row is FAIL: **Do not deploy. List what must be fixed.**
