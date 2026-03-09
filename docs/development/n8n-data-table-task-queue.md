# n8n Data Table Task Queue (one task = one row)

This flow implements a parent orchestrator + subflow handoff using n8n Data Tables.

## Data Table

Create a Data Table in n8n named `Project-bolt2-orchestration-tasks` with these columns:

- `taskId` (string, unique external key)
- `title` (string)
- `description` (string)
- `priority` (number)
- `status` (string: `open` | `in_progress` | `completed`)
- `agent` (string, optional)
- `callbackUrl` (string, optional)
- `returnAddress` (stringified JSON, optional)
- `createdTime` (datetime/string, optional)
- `updatedTime` (datetime/string, optional)

## Webhook payload

```json
{
  "callbackUrl": "http://172.17.132.107:8788/task-push",
  "returnAddress": {
    "protocol": "http",
    "hostSelection": "ip",
    "ip": "172.17.132.107",
    "port": 8788,
    "path": "/task-push"
  },
  "task": {
    "taskId": "bolt2-ui-17",
    "title": "refactor UI sidebar",
    "description": "normalize spacing tokens",
    "priority": 5,
    "status": "open",
    "agent": "ui-agent"
  },
  "completedTaskId": "bolt2-ui-16"
}
```

## Behavior

1. Parent workflow `Project-bolt2-task-orchestrator-queue` accepts incoming task + return address.
2. It immediately returns a normalized handoff payload (`machineTaskPayload`) for `Project-bolt2-machine-task-push-sync`.
3. Data Table operations still run in parallel for orchestration persistence (`mark completed`, `upsert`, `query open rows`).
4. Subflow `machine-task-push-sync` writes to queue table first, then attempts listener callback delivery.

## Response shape

```json
{
  "status": "ok",
  "workflow": "task-orchestrator-queue",
  "nextSubflow": "machine-task-push-sync",
  "callbackUrl": "http://172.17.132.107:8788/task-push",
  "returnAddress": {
    "protocol": "http",
    "hostSelection": "ip",
    "ip": "172.17.132.107",
    "port": 8788,
    "path": "/task-push",
    "host": "172.17.132.107"
  },
  "nextTask": {
    "taskId": "bolt2-ui-17",
    "title": "refactor UI sidebar",
    "priority": 5,
    "status": "open"
  },
  "machineTaskPayload": {
    "taskId": "bolt2-ui-17",
    "text": "refactor UI sidebar",
    "callbackUrl": "http://172.17.132.107:8788/task-push",
    "returnAddress": {
      "protocol": "http",
      "hostSelection": "ip",
      "ip": "172.17.132.107",
      "port": 8788,
      "path": "/task-push",
      "host": "172.17.132.107"
    },
    "payload": {
      "source": "Project-bolt2-task-orchestrator-queue",
      "nextTask": {
        "taskId": "bolt2-ui-17"
      }
    }
  }
}
```

Empty queue:

```json
{
  "status": "empty",
  "message": "no incoming task",
  "workflow": "task-orchestrator-queue",
  "nextSubflow": "machine-task-push-sync",
  "nextTask": null
}
```

## Final verification (2026-03-08)

Commands used:

```bash
pnpm run n8n:listener:config
pnpm run n8n:listener:return-address
pnpm run n8n:orchestrator -- list
```

Live smoke result (orchestrator -> machine subflow):

- `Project-bolt2-task-orchestrator-queue`: `status=ok`, returns `nextSubflow=machine-task-push-sync` and populated `machineTaskPayload`.
- `Project-bolt2-machine-task-push-sync`: `status=accepted` with Data Table queue write path active.

Current known gap:

- Callback delivery to listener can still return `pending-retry` with timeout (`30000ms`) when n8n cannot reach `http://172.17.132.107:8788/task-push`.
- This is network path reachability (listener/firewall/routing), not workflow topology.

## Example workflow JSON

This section is a conceptual sample only. The authoritative runtime definition is managed by:

- `scripts/n8n-dev-orchestrator.mjs`

```json
{
  "name": "Project-bolt2-task-orchestrator-queue",
  "nodes": [
    {
      "name": "Task Queue Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "bolt2-task-orchestrator",
        "httpMethod": "POST",
        "responseMode": "lastNode"
      }
    },
    {
      "name": "Completed Task?",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ $json.completedTaskId }}",
              "operation": "notEmpty"
            }
          ]
        }
      }
    },
    {
      "name": "Mark Completed Task Row",
      "type": "n8n-nodes-base.dataTable",
      "parameters": {
        "operation": "update",
        "dataTableId": "orchestration_tasks",
        "filters": {
          "conditions": [
            {
              "key": "taskId",
              "condition": "eq",
              "value": "={{ $json.completedTaskId }}"
            }
          ]
        },
        "updateFields": {
          "status": "completed"
        }
      }
    },
    {
      "name": "Upsert Incoming Task Row",
      "type": "n8n-nodes-base.dataTable",
      "parameters": {
        "operation": "upsert",
        "dataTableId": "orchestration_tasks",
        "keyField": "taskId",
        "fields": {
          "taskId": "={{ $json.task.taskId }}",
          "title": "={{ $json.task.title }}",
          "description": "={{ $json.task.description }}",
          "priority": "={{ $json.task.priority }}",
          "status": "={{ $json.task.status || \"open\" }}",
          "agent": "={{ $json.task.agent || \"\" }}"
        }
      }
    },
    {
      "name": "Get Open Task Rows",
      "type": "n8n-nodes-base.dataTable",
      "parameters": {
        "operation": "get",
        "dataTableId": "orchestration_tasks",
        "filters": {
          "conditions": [
            {
              "key": "status",
              "condition": "eq",
              "value": "open"
            }
          ]
        }
      }
    },
    {
      "name": "Sort by Priority",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const tasks = items.map((item) => item.json);\n\ntasks.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));\n\nreturn tasks.map((task) => ({ json: task }));"
      }
    },
    {
      "name": "Return Next Task",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": "const nextTask = items[0]?.json || null;\n\nif (!nextTask) {\n  return [{ json: { status: \"empty\", message: \"no open tasks\", nextTask: null } }];\n}\n\nreturn [{ json: { status: \"ok\", nextTask } }];"
      }
    }
  ]
}
```

## Deploy

```bash
pnpm run n8n:orchestrator -- deploy
pnpm run n8n:orchestrator -- list
```

Managed key:

- `task-orchestrator-queue`
