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
