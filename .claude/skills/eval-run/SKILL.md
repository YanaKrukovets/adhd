---
description: Run planner or session eval suites and produce a scored report with failure analysis.
---

# /eval-run — Run & Interpret Evals

## Steps

### 1. Determine which suite(s) to run
- `planner` — evaluates task decomposition quality
- `session` — evaluates agent conversation behavior
- `both` — run both (used in `/ship-check`)

### 2. Run the suite(s)
```
npm run evals:planner   # outputs scripts/evals/results/planner-latest.json
npm run evals:session   # outputs scripts/evals/results/session-latest.json
```

### 3. Parse and render a score table
For each rubric dimension, render:
| Dimension | Pass Rate | Target | Status |
|---|---|---|---|
| first_action_concrete | 85% | ≥80% | ✓ PASS |
| first_action_lte_5min | 78% | ≥80% | ✗ FAIL |
| ...

### 4. List the 5 worst-scoring fixtures
For each: show the intention input, the agent's output, and the judge's reasoning for the low score.

### 5. Propose (don't apply) prompt fixes
For each failure pattern, propose a targeted prompt edit. Do NOT apply the edit — that requires `/prompt-change`.

### 6. Check golden set drift
If the golden set scores deviate >1 point total from the frozen baseline, flag: "Judge drift detected — re-calibrate before trusting these scores."
