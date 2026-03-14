# n8n Local Listener (Machine Callback + Task Push)

This listener lets n8n call back into your local Opurion workspace while VS Code is running.

## 1) Configure endpoint address

Edit this file:

- `../listener-config.json` from `Opurion` (workspace root)

Example template:

- `docs/development/examples/n8n-listener-config.example.json`

Quick start:

- copy example to root config and edit values for your machine/network.

Fields to set:

- `agent.id`: worker/agent id (for example `markku-dth01`)
- `agent.name`: human-readable worker name
- `listener.host`: bind host (`0.0.0.0` for LAN access)
- `listener.port`: local listener port
- `returnAddress.protocol`: `http` or `https`
- `returnAddress.hostSelection`: `fqdn` or `ip` (choose one mode)
- `returnAddress.fqdn`: used when `hostSelection` is `fqdn`
- `returnAddress.ip`: used when `hostSelection` is `ip`
- `returnAddress.port`
- `returnAddress.path`: callback path (default `/publish-status`)

Selection rule:

- Listener resolves callback host from `hostSelection`.
- If selected field is empty, it falls back to the other field for compatibility.

Print effective config:

- `pnpm run n8n:listener:config`
- `pnpm run n8n:listener:return-address`

Compatibility note:

- Listener first tries agent-specific files by active agent id:
  - `../listener-config.<agentId>.json`
  - `listener-config.<agentId>.json`
  - `bolt.work/n8n/listener-config.<agentId>.json`
- If none found, it falls back to generic config files:
  - `../listener-config.json`
  - `listener-config.json`
  - `bolt.work/n8n/listener-config.json`
- If missing, it falls back to `Opurion/listener-config.json`.
- If all are missing, listener uses built-in defaults.

## 2) Start listener

Run:

- `pnpm run n8n:listener`

Health check:

- `GET http://<host>:<port>/health`
- `GET http://<host>:<port>/config`

## 3) Auto-stop behavior (VS Code guard)

The listener auto-shuts down if VS Code process is not detected.

Config section:

- `vscodeGuard.enabled`
- `vscodeGuard.checkIntervalSeconds`
- `vscodeGuard.processNames`

This ensures the listener is active only when VS Code/Copilot session is active.

## 4) n8n workflow for publish checks

Managed workflow:

- `Project-bolt2-ci-publish-watch-sync`

Behavior:

- polls package page at +10/+20/+30/+40/+50 minutes
- checks expected image tag publication
- posts result to listener callback URL

## 5) n8n workflow for pushing tasks to machine

Managed workflow:

- `Project-bolt2-machine-task-push-sync`

Behavior:

- receives orchestration task payload
- writes task to n8n Data Table queue first (`Project-bolt2-machine-task-queue`)
- attempts callback delivery to local listener `/task-push`
- marks queue row as `delivered` or `pending-retry`

This queue-first flow prevents lost tasks when listener is down.

Data Table requirement (mandatory):

- Workflow `Project-bolt2-machine-task-push-sync` requires a Data Table binding.
- If your n8n instance does not expose Data Tables API, set env var `N8N_MACHINE_TASK_QUEUE_TABLE_ID` (or `N8N_MACHINE_TASK_QUEUE_TABLE`) to an existing table id/name before deploy.

Required queue columns (dedicated table option):

- `taskId`
- `status`
- `taskText`
- `callbackUrl`
- `queuedAt`
- `deliveredAt`
- `deliveryError`
- `sourceWorkflow`

Compatibility table option:

- You can bind to existing `orchestration_tasks` table.
- Required columns for compatibility mapping: `taskId`, `title`, `description`, `priority`, `status`, `agent`, `createdTime`, `updatedTime`.

## 6) Local inbox files consumed by Copilot workflow

Listener writes payloads to:

- `bolt.work/n8n/copilot-inbox/publish-status.latest.json`
- `bolt.work/n8n/copilot-inbox/task-push.latest.json`
- `bolt.work/n8n/copilot-inbox/task-push.latest-prompt.md`
- `bolt.work/n8n/copilot-inbox/task-push-history/*.json`
- `bolt.work/n8n/copilot-inbox/task-keepalive.latest.json`
- `bolt.work/n8n/copilot-inbox/feedback-watchdog.latest.json`
- `bolt.work/n8n/copilot-inbox/callback.latest.json`
- `bolt.work/n8n/copilot-inbox/callback.latest.md`
- `bolt.work/n8n/copilot-inbox/feedback-loop.command.latest.json`
- `bolt.work/n8n/copilot-inbox/feedback-loop.command.latest.md`
- `bolt.work/n8n/copilot-inbox/feedback-loop-command-history/*.json`

Copilot runs can consume these files while VS Code is open.

Live output in main listener process:

- On every callback receive (`/publish-status` or `/task-push`), listener prints `CALLBACK_RECEIVED` summary lines to the running process output.
- Keepalive callback (`/task-keepalive`) also writes `callback.latest.*` and prints `CALLBACK_RECEIVED` summary lines.
- Output includes type, endpoint, source, status, taskId, title, callback URL, and delivery error (if present).
- `callback.latest.md` is continuously updated so callback state is viewable even after logs scroll.
- When callback payload indicates continuation/restart signal, listener emits `FEEDBACK_LOOP_COMMAND` lines and writes command artifacts.
- If callback source host is blocked by allowlist, listener prints `CALLBACK_REJECTED` with normalized host details.

Feedback-loop control channel:

- Listener can command continuation through callback payload signals.
- Command mapping:
  - Continue signals (`status=partial/in_progress`, `action`/`jobPulse`/`finalRemark` includes `continue`) -> `pnpm run ongoing:auto:continue`
  - Restart-cycle signals (`queueState=empty`, `action=restart-cycle`, `jobPulse=start-new-ongoing-check-job`) -> `pnpm run ongoing:cycle -- scan`
  - Explicit command payload (`command` or `feedbackLoop.command`) overrides auto mapping.
- Keepalive channel:
  - Endpoint `POST /task-keepalive` records task heartbeat (`task-keepalive.latest.json`) and marks feedback loop as active.
  - Endpoint `GET /feedback-loop/status` returns current watchdog state and thresholds.
  - Keepalive helper commands:
    - `pnpm run ongoing:keepalive:pulse` sends a bounded 3-pulse keepalive cadence through existing n8n (`machine-task-push-sync`) to `/task-keepalive`.
    - `pnpm run ongoing:keepalive:daemon` sends continuous keepalive pulses until stopped.
    - `pnpm run ongoing:auto:continue` now emits a one-shot keepalive pulse before queue checks.
- Inactivity watchdog:
  - While active, if no callback/keepalive is heard for `feedbackLoop.inactivitySeconds` (default 300s), listener emits a continue command artifact.
  - Emissions are rate-limited by `feedbackLoop.promptCooldownSeconds` (default 120s).
  - Poll cadence is `feedbackLoop.checkIntervalSeconds` (default 20s).

Windows port/firewall verification:

- On Windows startup, listener verifies whether inbound TCP rule coverage exists for the configured listener port.
- Listener does **not** auto-open the port.
- Listener detects active Windows Security Center products (AV/firewall) and writes a forwarding request to `bolt.work/n8n/copilot-inbox/windows-security-request.latest.json`.
- Listener also writes a human-readable request file: `bolt.work/n8n/copilot-inbox/windows-security-request.latest.md`.
- Listener opens Windows Security Firewall view so port-open action can be approved in the security product workflow.
- Listener always opens a Windows popup alert when a port-open request is created, explicitly telling you to open inbound TCP port `<listener.port>`.
- On bind failures (for example `EADDRINUSE`), listener also writes/updates the same request file and shows popup fallback when forwarding is not successful.

## 7) Example n8n task push payload

POST to n8n workflow webhook `machine-task-push-sync`:

```json
{
  "taskId": "bolt2-p3-example-task",
  "text": "Investigate failing publish verification for latest SHA.",
  "returnAddress": {
    "protocol": "http",
    "hostSelection": "ip",
    "fqdn": "localhost",
    "ip": "172.17.132.201",
    "port": 8788,
    "path": "/task-push"
  }
}
```

## 8) Final checkup status (2026-03-08)

Verified commands:

- `pnpm run n8n:listener:config`
- `pnpm run n8n:listener:return-address`
- `pnpm run n8n:orchestrator -- list`

Verified runtime state:

- Listener bind host: `172.17.132.107`
- Return address mode: `hostSelection=ip`
- Return callback URL: `http://172.17.132.107:8788/publish-status`
- Managed workflows active: `ongoing-work-dispatch`, `task-orchestrator-queue`, `ci-publish-watch-sync`, `machine-task-push-sync`
- DataTable variant intentionally inactive: `ongoing-work-dispatch-data-table`

Verified orchestration chain:

- Parent orchestrator (`Project-bolt2-task-orchestrator-queue`) returns `machineTaskPayload` for subflow handoff.
- Subflow (`Project-bolt2-machine-task-push-sync`) accepts handoff and persists to Data Table queue.

Known remaining item:

- Callback delivery to listener can still timeout from n8n (`pending-retry`, `timeout of 30000ms exceeded`).
- This indicates network reachability/firewall/routing from n8n host to listener endpoint `172.17.132.107:8788`.
