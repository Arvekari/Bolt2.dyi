# Recovered Ongoing-Work Snapshot (from n8n artifacts)

Recovered on: 2026-03-08
Source files:

- `bolt.work/n8n/copilot-inbox/_tmp_bridge.json`
- `bolt.work/n8n/copilot-inbox/_tmp_cycle_next.json`
- `bolt.work/n8n/copilot-inbox/_tmp_cycle_next_after_chat_close.json`

## Recovered Entries (historical wording)

- `PARTIAL` [taskId: bolt2-p0-cycle-restart-guard] Make sure the when everything is completed the n8n work flow commands the github copilot llm to restart the cycle of checkin ongoing work after two check cycles witth out work it can stop until started again.
- `PARTIAL` [taskId: bolt2-p0-chat-input-reliability] ESCALATED user-impact incident (first to solve): chat textarea input is still unreliable for end users (cursor visible but typed text may not appear). Regression test guard is added (`unit-tests/components/chat/ChatBox.input-regression.test.tsx`) and passing. Additional fix applied in `app/components/chat/Chat.client.tsx` to use direct `setInput(value)` updates (not event forwarding) for textarea and web-search insertion; remaining closure criteria is real UI flow verification on current `main`.
- `PARTIAL` [taskId: bolt2-p0-data-table-contract] End-to-end data-table payload contract hardening: workflow communication now carries `taskStatusTable` (100 bounded rows), `openTasksTable` (active tasks), `orchestrationStats`, `checkupTable`, and `failureTable`. P0 blocker in run `#60` was workflow validation failure from native Data Table node configuration on current instance; dispatch template now uses execution-safe payload status nodes so orchestration runs while fallback file sync remains authoritative until native Data Tables are available.
- `PARTIAL` [taskId: bolt2-p0-persistence-gate] Data-table/stats persistence verification gate: cycle now enforces payload shape and orchestration delivery; next closure step is adding explicit automated assertion command for row semantics (`isActive` filter + completed sliding behavior).
- `PARTIAL` [taskId: bolt2-p1-ui-redesign-task-identification] UI redesign task identification from directive docs is not complete yet. Required mapping from `docs/development/ui-design-directive.md` and `docs/development/ui-redesign-action-plan.md` into concrete implementation tickets is still pending. alse the ui need to be light and fast to load
- `TODO` [taskId: bolt2-p2-ui-redesign-t1] UI redesign execution T1: tokenize spacing/typography/color roles and remove arbitrary spacing in shared UI primitives.
- `TODO` [taskId: bolt2-p2-ui-redesign-t2] UI redesign execution T2: standardize chat surface controls and navigation shell patterns per directive (buttons, forms, active states, predictable placement).
- `TODO` [taskId: bolt2-p2-ui-redesign-t3] UI redesign execution T3: begin icon normalization on high-traffic surfaces with Lucide as default.
- `TODO` [taskId: bolt2-p3-llm-debug-panel] when we are waiting action from the llm and we cansee the waiting icon rolling the three dots. we could have a button that could show as a "debug" windows on the bottom of the page wehre wqe could see waht is actually happening could be usefull for the user also
- `TODO` [taskId: bolt2-p5-fullstack-backend-generation] Bolt2.dyi needs to be able also to create backend logic and fuctions with perl fastapi or what so ever but it needs to be more of a full stack easy to use development tool like lovable

## Notes

- This is a partial recovery from orchestration artifacts, not a full lossless restore of `.ongoing-work.md` uncategorized history.
- These entries are preserved verbatim from n8n payload snapshots to retain original ideation wording.
