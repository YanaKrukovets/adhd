# DB & telemetry schema notes

- `agentCalls.agentType` (`planner | session | eval_judge`) is already a cost bucket — do NOT add a redundant `cost_bucket` column. Derive per-session/per-task cost metrics as joins in queries, not as schema.
- Check-in telemetry lives in `sessionEvents.metadata` (jsonb). For `eventType: 'checkin'` rows, store `{ sent_at, response_delay_seconds, abandoned }`. This is the data needed to tune interruption cadence per user.
- DB access only via `queries.js` — no inline SQL in routes.
