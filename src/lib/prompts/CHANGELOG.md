# Prompt Changelog

All prompt changes must be recorded here via the `/prompt-change` skill.
Each entry must include before/after eval scores for all rubric dimensions.

---

## planner.md

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
