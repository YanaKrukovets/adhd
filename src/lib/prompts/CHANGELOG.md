# Prompt Changelog

All prompt changes must be recorded here via the `/prompt-change` skill.
Each entry must include before/after eval scores for all rubric dimensions.

---

## planner.md

### v1.1.0 — 2026-06-13 (activation energy + self-critique)
Two changes in one bump (tightly coupled — both address the same "bad first action" failure mode):

**1. Lowest-aversiveness rule** added to `first_action` requirements:
Prefer the entry point with least social friction/anxiety when two options are equally concrete. Phone calls → online booking, confrontational email → async form, etc. ADHD brains have disproportionate activation cost for aversive actions even when the action is short.

**2. Self-critique checklist** added before returning:
Agent silently checks every `first_action` against: observable? ≤5 min? has verb? no sub-decision? low aversiveness? Also checks total plan length (>7 tasks triggers cut/merge).

Eval scores (planner suite):
| Dimension | Before | After |
|---|---|---|
| first_action_concrete | — (baseline pending, no ANTHROPIC_API_KEY at edit time) | — |
| first_action_lte_5min | — | — |
| dependency_order | — | — |
| no_hallucinated_prerequisites | — | — |
| clarifying_question_discipline | — | — |

Hypothesis: self-critique catches vague first actions the model would otherwise emit on first pass (well-documented in structured-output literature). Aversiveness rule is ADHD-specific — "call the dentist" is concrete and ≤5 min but will sit undone; "click Book Online" gets done.

---

### v1.0.0 — 2026-06-12 (initial)
Initial prompt. Establishes:
- Voice: calm friend, not coach
- first_action rules: concrete, ≤5min, physical, specific URL/name
- clarifying question discipline: ask only when genuinely ambiguous
- suggested_today: ≤3 items

Eval baseline scores (planner suite, 5 placeholder fixtures):
| Dimension | Score |
|---|---|
| first_action_concrete | — (baseline pending full 50-fixture suite) |
| first_action_lte_5min | — |
| dependency_order | — |
| no_hallucinated_prerequisites | — |
| clarifying_question_discipline | — |

---

## session-agent.md

### v1.4.0 — 2026-06-18 (pin the "done" → close-out behavior with an example)
Fix for a bug still seen in prod on v1.3.0: a single-step task ("Identify the download button"), user typed "done" in chat, agent replied **"Got it. What's next?"** instead of offering to close out — then only reached the wrap-up question after a *second* "done". v1.3.0 already made "finished" the default in prose, but the running model (`gemini-3.1-flash-lite`) fumbles the conditional ("is there a prior `split_task` sub-step?") and falls back to "what's next?".

Change: added an explicit negative rule (never reply "What's next?" to a "done" signal) plus a pinned wrong/right few-shot example using the exact failing phrase. No change to the underlying logic — only making the existing v1.3.0 intent unmissable for a weak lite model. The deterministic "This task is done" *button* path (commit 3802bb0) was already fixed; this targets the free-text chat path.

Eval scores (session suite):
| Dimension | Before | After |
|---|---|---|
| interruption_appropriateness | — (key/quota-blocked) | — (key/quota-blocked) |
| tone_shame_free | — (key/quota-blocked) | — (key/quota-blocked) |
| correct_tool_selection | — (key/quota-blocked) | — (key/quota-blocked) |

⚠️ Evals NOT run: `GOOGLE_GENERATIVE_AI_API_KEY` is unset in this environment (`npm run evals:session` errors out before any call). Same gap as v1.2.0/v1.3.0. Re-run and backfill once a key/billing is available. Note: the current session suite has **no scenario** covering "single done → close out" — add one (s006) so this regression is caught automatically.

Hypothesis: lite models follow concrete few-shot examples far more reliably than multi-condition prose rules. Pinning the exact wrong phrase ("Got it. What's next?") to a correct rewrite removes the model's room to default into the loop.

---

### v1.3.0 — 2026-06-17 (default "done" to finished)
Fix for v1.2.0, which still looped on plain "done". v1.2.0 told the agent a short "done" means *step*-done and to keep asking "what's next?" — exactly the loop we were trying to kill. Reported still-broken by the user in testing.

Change: invert the default. Plain "done" / "did it" / "finished" / "next" / "that's it" now means the **task** is complete → confirm once → `update_task_state(done)` → `end_session`. The "keep going with what's next?" path is now the *exception*, gated on a real already-known remaining sub-step (i.e. a prior `split_task` whose sub-steps aren't all done). Without such a tracked step, "done" closes the task.

Eval scores (session suite):
| Dimension | Before | After |
|---|---|---|
| interruption_appropriateness | — (quota-blocked) | — (quota-blocked) |
| tone_shame_free | — (quota-blocked) | — (quota-blocked) |
| correct_tool_selection | — (quota-blocked) | — (quota-blocked) |

⚠️ Still quota-blocked (Gemini free-tier 429s). Re-run `npm run evals:session` once quota resets / billing is enabled and backfill v1.2.0 + v1.3.0.

Hypothesis: the loop was caused by the prompt's own default ("done" = step). Making "finished" the default and "continue" the gated exception matches how single-action tasks actually behave, and stops the model padding the session.

---

### v1.2.0 — 2026-06-17 (task-completion detection)
Added a "Recognizing when the task is finished" section so the agent stops looping on "what's next?" forever.

Problem: the agent only exits via `update_task_state(done)` or `end_session`, both of which it fired only on an explicit "I'm stopping." A user answering each step with "done" got an endless "That's done — what's next?" loop because nothing tied completion to the task itself.

Change: guidance to distinguish *step*-done from *task*-done. When the original task/first action looks satisfied (or the user signals "that's it / all done / finished", or the agent notices it's manufacturing follow-up steps), confirm once — "Sounds like [task] itself is done — want to close it out?" — then call `update_task_state(done)` followed by `end_session`. Explicit instruction not to invent steps to keep the session alive.

Paired with a UI change: a "Mark done" affordance in SessionChat so users aren't reliant on the model inferring completion from free text.

Eval scores (session suite):
| Dimension | Before | After |
|---|---|---|
| interruption_appropriateness | — (quota-blocked) | — (quota-blocked) |
| tone_shame_free | — (quota-blocked) | — (quota-blocked) |
| correct_tool_selection | — (quota-blocked) | — (quota-blocked) |

⚠️ Evals NOT run cleanly: the Gemini free-tier judge returned 429s — 4 of 5 scenarios scored a flat 0/2 and one a perfect 2/2 (the all-or-nothing signature of quota errors, not genuine scores). Re-run `npm run evals:session` once quota resets / billing is enabled and backfill this table. Change shipped at user's direction with this gap acknowledged.

Hypothesis: making "finished" a first-class concept (confirm-then-close) breaks the infinite "what's next?" loop without violating the body-double posture — the agent confirms rather than unilaterally declaring done, and refuses to pad the session to stay busy.

---

### v1.1.0 — 2026-06-13 (flow mode)
Added `enter_flow_mode` tool and updated check-in protocol to support first-class flow state.

Changes:
- New `enter_flow_mode` tool: sets `flow_mode_until` on the session, silencing check-ins server-side. Agent responds with "I'll stay quiet unless you need me."
- Check-in protocol note: server already filters check-ins during flow mode; clarified to agent so it doesn't double-guess.
- Duration guidance: vague signal → 30 min, explicit → match literally, strong hyperfocus → up to 60 min.

Eval scores (session suite):
| Dimension | Before | After |
|---|---|---|
| interruption_appropriateness | — (baseline pending, no ANTHROPIC_API_KEY at edit time) | — |
| tone_shame_free | — | — |
| correct_tool_selection | — | — |

Hypothesis: making flow mode first-class (tool + server gate) prevents the most harmful interruption pattern for ADHD users — breaking hyperfocus. The one-sentence response ("I'll stay quiet unless you need me.") aligns with body-double posture.

---

### v1.0.0 — 2026-06-12 (initial)
Initial prompt. Establishes:
- Body double persona, not coach/manager
- Voice: short, plain, non-judgmental
- Tool use guidance for all 5 tools
- Check-in protocol: silent / gentle / escalate
- Spiral and off-task handling

Eval baseline scores (session suite):
| Dimension | Score |
|---|---|
| interruption_appropriateness | — (baseline pending) |
| tone_shame_free | — |
| correct_tool_selection | — |
