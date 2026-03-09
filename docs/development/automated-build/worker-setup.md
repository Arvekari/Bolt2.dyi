# Automated Build Worker Setup (Safe Template)

Purpose: configure additional local workers for orchestrated development without exposing any credentials or secrets in repo docs.

## Security Rules

- Never commit API keys, tokens, passwords, private URLs, or `.env` values.
- Share only variable names and expected formats.
- Keep machine-specific values local.

## Required Environment Variable Names

Set these locally on each worker machine:

- `BOLT_AGENT_ID` (preferred explicit worker identifier)
- `N8N_AGENT_ID` (optional alias)
- `AGENT_ID` (optional fallback alias)
- `n8n_Arvekari_endpoint` (n8n base endpoint)
- `n8n_Arvekari_ApiKey` (n8n API key)

Resolution order in runtime scripts:

1. `BOLT_AGENT_ID`
2. `N8N_AGENT_ID`
3. `AGENT_ID`
4. Hostname fallback (`COMPUTERNAME` / `HOSTNAME`)

## Minimal Local Setup Steps

1. Clone repo and install dependencies:
   - `pnpm install`
2. Configure local environment variables (machine/user scope).
3. Verify bridge identity output:
   - `pnpm run ongoing:bridge -- prompt`
   - Confirm prompt shows `Agent: <your-agent-id>`.
4. Verify orchestration sees open tasks:
   - `pnpm run n8n:sync-open-tasks`
   - Check `bolt.work/n8n/open-tasks-table.json` has your `agent` value.

## Multi-Worker Conventions

- Use unique `BOLT_AGENT_ID` per machine (for example `worker-a`, `worker-b`).
- Keep one active objective per worker to reduce collisions.
- Always use cycle commands for status transitions:
  - Start/continue from bridge: `pnpm run ongoing:bridge -- prompt`
  - Keep in progress: `pnpm run ongoing:cycle -- partial "[taskId: ...] ..."`
  - Close only when fully complete: `pnpm run ongoing:cycle -- done --confirm-complete "[taskId: ...] ..."`

## Repository Tracking Note

`.ongoing-work.md` is intentionally not ignored so orchestration state can be tracked explicitly with code changes.

## Troubleshooting

- If agent id is missing in outputs, set `BOLT_AGENT_ID` explicitly and rerun bridge.
- If sync fails, verify local n8n endpoint/key env vars exist and are valid.
- If objective closure fails from `PARTIAL`, rerun with explicit completion flag:
  - `pnpm run ongoing:cycle -- done --confirm-complete "[taskId: ...] ..."`
