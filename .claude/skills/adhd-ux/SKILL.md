---
description: Review UI copy, flows, or components for ADHD-appropriateness. Auto-apply when writing user-facing copy or session UI.
---

# /adhd-ux — ADHD UX Checklist

This skill runs automatically whenever user-facing copy or session UI is written or changed. It is also available on demand.

## Checklist

### 1. Shame language scan
Search the changed files for forbidden words/phrases:
- `overdue`
- `you failed` / `failed to`
- `you missed` / `missed deadline`
- `streak` (implies loss if broken)
- `behind`
- `late`
- `should have`
- `didn't`

**Any hit = blocking violation.** Rewrite the copy before proceeding.

### 2. Choice overload
Count the distinct interactive options on each screen. More than 3 options visible at once = violation. Simplify or hide behind progressive disclosure.

### 3. Ceremony check
Does this change add a required step before the user gets value? Every added step costs users with initiation difficulty. If yes: is it absolutely necessary, or can it be deferred/eliminated?

### 4. Countdown timer check
Does any new component show a countdown (time remaining)? STOP. Replace with elapsed-time indicator only.

### 5. Reading level
Is any new copy longer than 2 sentences? Is any sentence longer than 20 words? Flag for simplification.

### 6. First-action immediacy
Can the user go from landing on this screen to "started on something" in ≤2 interactions? If not, redesign the flow.

## Output
A violations table:
| Check | Status | Finding |
|---|---|---|
| Shame language | ✗ FAIL | "overdue" in TaskCard line 42 |
| Choice overload | ✓ PASS | |
| ...

All violations must be resolved before the feature is marked done.
