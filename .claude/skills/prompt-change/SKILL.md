---
description: Modify any agent system prompt (planner.md, session-agent.md). MUST be used for all prompt edits.
---

# /prompt-change — Guarded Prompt Editing

This skill is the ONLY permitted path for editing `src/lib/prompts/*.md`. The `prompt-change-guard.js` hook blocks direct edits.

## Steps

### 1. Read current state
Read the target prompt file and `src/lib/prompts/CHANGELOG.md`. Note the current `prompt_version`.

### 2. Run baseline evals
```
npm run evals:planner   # if editing planner.md
npm run evals:session   # if editing session-agent.md
```
Record the baseline score table (all rubric dimensions).

### 3. Create the guard marker
```
touch .prompt-change-session
```
This unlocks prompt file editing for the current session.

### 4. Make the edit
Apply the prompt change. Keep it minimal — one hypothesis at a time.

### 5. Re-run evals
Run the same eval suite as step 2. Compare scores dimension by dimension.

### 6. Regression check
If ANY dimension regressed >5% (absolute percentage points):
- Revert the change immediately.
- Report: which dimension regressed, by how much, and a hypothesis why.
- Do NOT proceed to step 7.

### 7. Update CHANGELOG.md
Add an entry with:
- Date
- Change description
- Before/after score table (all dimensions)
- Hypothesis for why this improved things

### 8. Bump prompt_version
In the relevant agent file (`src/lib/agents/planner.js` or `src/lib/agents/session.js`), increment the `PROMPT_VERSION` constant.

### 9. Remove the guard marker
```
rm .prompt-change-session
```

### 10. Commit
```
git add src/lib/prompts/ src/lib/agents/
git commit -m "eval(prompts): <description of change> [before: X%, after: Y%]"
```
