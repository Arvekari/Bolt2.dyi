#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const STATE_FILE = resolve('.n8n-dev-workflows.json');
const WORKFLOW_PREFIX = 'Project-bolt2-';
const ONGOING_WORK_FILE = resolve('.ongoing-work.md');
const WORKFLOW_REPO_ROOT = resolve('..', 'n8n');
const WORKFLOW_REPO_ACTIVE_DIR = resolve(WORKFLOW_REPO_ROOT, 'active');
const WORKFLOW_REPO_RETIRED_DIR = resolve(WORKFLOW_REPO_ROOT, 'retired');
const RETIRED_WORKFLOW_NAMES = ['overnight-ongoing-work-loop', 'Project-bolt2-overnight-ongoing-work-loop'];
const DEFAULT_OPEN_TASKS_TABLE_NAME = 'Project-bolt2-open-tasks';
const OPEN_TASKS_TABLE_FALLBACK_NAMES = ['Project-bolt2-orchestration-tasks', 'orchestration_tasks'];
const ORCHESTRATION_TASKS_TABLE_NAME = 'Project-bolt2-orchestration-tasks';
const ORCHESTRATION_TASKS_TABLE_FALLBACK_ID = 'orchestration_tasks';
const MACHINE_TASK_QUEUE_TABLE_NAME = 'Project-bolt2-machine-task-queue';
const MACHINE_TASK_QUEUE_TABLE_FALLBACK_ID = 'orchestration_tasks';
const OPEN_TASKS_FALLBACK_FILE = resolve('bolt.work', 'n8n', 'open-tasks-table.json');
const ORCHESTRATION_STATS_FILE = resolve('bolt.work', 'n8n', 'orchestration-stats.latest.json');

const MACHINE_TASK_QUEUE_TABLE_COLUMNS = [
  { name: 'taskId', type: 'string' },
  { name: 'status', type: 'string' },
  { name: 'taskText', type: 'string' },
  { name: 'callbackUrl', type: 'string' },
  { name: 'queuedAt', type: 'string' },
  { name: 'deliveredAt', type: 'string' },
  { name: 'deliveryError', type: 'string' },
  { name: 'sourceWorkflow', type: 'string' },
];

const ORCHESTRATION_TASKS_TABLE_COLUMNS = [
  { name: 'taskId', type: 'string' },
  { name: 'title', type: 'string' },
  { name: 'description', type: 'string' },
  { name: 'priority', type: 'string' },
  { name: 'status', type: 'string' },
  { name: 'agent', type: 'string' },
  { name: 'callbackUrl', type: 'string' },
  { name: 'returnAddress', type: 'string' },
  { name: 'createdTime', type: 'string' },
  { name: 'updatedTime', type: 'string' },
];

const WORKFLOWS = [
  {
    key: 'ongoing-work-dispatch',
    name: 'Project-bolt2-ongoing-work-dispatch',
    webhookPath: 'ongoing-work-dispatch',
    purpose:
      'Receives ongoing-work objective events and returns next-action guidance for iterative execution until no unfinished objectives remain.',
    definition: {
      name: 'Project-bolt2-ongoing-work-dispatch',
      nodes: [
        {
          id: 'node-ongoing-dispatch-webhook',
          name: 'Ongoing Work Dispatch Webhook',
          webhookId: 'project-bolt2-ongoing-work-dispatch',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [320, 260],
          parameters: {
            path: 'ongoing-work-dispatch',
            httpMethod: 'POST',
            responseMode: 'lastNode',
          },
        },
        {
          id: 'node-ongoing-dispatch-ack',
          name: 'Ongoing Work Dispatch Ack',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [620, 260],
          parameters: {
            keepOnlySet: false,
            values: {
              string: [
                {
                  name: 'status',
                  value: 'accepted',
                },
                {
                  name: 'workflow',
                  value: 'ongoing-work-dispatch',
                },
                {
                  name: 'action',
                  value:
                    "={{ (((($json.payload || {}).openCount ?? (($json.body || {}).payload || {}).openCount) === 0) ? 'restart-cycle' : 'continue-objective') }}",
                },
                {
                  name: 'queueState',
                  value:
                    "={{ (((($json.payload || {}).openCount ?? (($json.body || {}).payload || {}).openCount) === 0) ? 'empty' : 'open') }}",
                },
                {
                  name: 'jobPulse',
                  value:
                    "={{ (((($json.payload || {}).openCount ?? (($json.body || {}).payload || {}).openCount) === 0) ? 'start-new-ongoing-check-job' : 'continue-current-job') }}",
                },
                {
                  name: 'restartCommand',
                  value:
                    "={{ (((($json.payload || {}).openCount ?? (($json.body || {}).payload || {}).openCount) === 0) ? 'pnpm run ongoing:cycle -- scan' : '') }}",
                },
                {
                  name: 'nextAction',
                  value:
                    "={{ (((($json.payload || {}).openCount ?? (($json.body || {}).payload || {}).openCount) === 0) ? 'Start a new ongoing-work check job immediately' : 'Continue current objective execution') }}",
                },
                {
                  name: 'finalRemark',
                  value:
                    "={{ (((($json.payload || {}).openCount ?? (($json.body || {}).payload || {}).openCount) === 0) ? 'Trigger a fresh ongoing-work scan as a new job' : 'Proceed with the current queued objective') }}",
                },
                {
                  name: 'commandsJson',
                  value:
                    "={{ JSON.stringify((((($json.payload || {}).openCount ?? (($json.body || {}).payload || {}).openCount) === 0) ? [{ type: 'cycle.restart', command: 'pnpm run ongoing:cycle -- scan' }] : [{ type: 'objective.executeNext' }])) }}",
                },
              ],
            },
          },
        },
        {
          id: 'node-upsert-open-tasks-table',
          name: 'Upsert Open Tasks Table',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [900, 260],
          parameters: {
            keepOnlySet: false,
            values: {
              string: [
                {
                  name: 'openTasksTableFlowStatus',
                  value: "={{ ((($json.payload || {}).openTasksTable || (($json.body || {}).payload || {}).openTasksTable) ? 'payload-ready' : 'payload-missing') }}",
                },
              ],
            },
          },
        },
        {
          id: 'node-upsert-orchestration-stats',
          name: 'Upsert Orchestration Stats',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [1100, 260],
          parameters: {
            keepOnlySet: false,
            values: {
              string: [
                {
                  name: 'orchestrationStatsFlowStatus',
                  value: "={{ ((($json.payload || {}).orchestrationStats || (($json.body || {}).payload || {}).orchestrationStats) ? 'payload-ready' : 'payload-missing') }}",
                },
              ],
            },
          },
        },
      ],
      connections: {
        'Ongoing Work Dispatch Webhook': {
          main: [
            [
              {
                node: 'Ongoing Work Dispatch Ack',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Ongoing Work Dispatch Ack': {
          main: [
            [
              {
                node: 'Upsert Open Tasks Table',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Upsert Open Tasks Table': {
          main: [
            [
              {
                node: 'Upsert Orchestration Stats',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
      settings: {},
    },
    aliases: ['ongoing-work-dispatch', 'Project-bolt2-ongoing-work-dispatch'],
  },
  {
    key: 'ongoing-work-dispatch-data-table',
    name: 'Project-bolt2-ongoing-work-dispatch-data-table',
    webhookPath: 'ongoing-work-dispatch-data-table',
    purpose:
      'Native Data Table variant: writes one row per open task to Data Tables using workflow nodes for UI-visible orchestration state.',
    activateOnDeploy: false,
    definition: {
      name: 'Project-bolt2-ongoing-work-dispatch-data-table',
      nodes: [
        {
          id: 'node-ongoing-dispatch-dt-webhook',
          name: 'Ongoing Work Dispatch DataTable Webhook',
          webhookId: 'project-bolt2-ongoing-work-dispatch-data-table',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [320, 460],
          parameters: {
            path: 'ongoing-work-dispatch-data-table',
            httpMethod: 'POST',
            responseMode: 'lastNode',
          },
        },
        {
          id: 'node-ongoing-dispatch-dt-ack',
          name: 'Ongoing Work Dispatch DataTable Ack',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [620, 460],
          parameters: {
            keepOnlySet: false,
            values: {
              string: [
                {
                  name: 'status',
                  value: 'accepted',
                },
                {
                  name: 'workflow',
                  value: 'ongoing-work-dispatch-data-table',
                },
                {
                  name: 'action',
                  value:
                    "={{ (((($json.payload || {}).openCount ?? (($json.body || {}).payload || {}).openCount) === 0) ? 'restart-cycle' : 'continue-objective') }}",
                },
              ],
            },
          },
        },
        {
          id: 'node-upsert-open-tasks-data-table',
          name: 'Upsert Open Tasks DataTable',
          type: 'n8n-nodes-base.dataTable',
          typeVersion: 1,
          position: [900, 460],
          parameters: {
            operation: 'upsert',
            table: 'Project-bolt2-open-tasks',
            data: '={{ ($json.payload || {}).openTasksTable || (($json.body || {}).payload || {}).openTasksTable || [] }}',
            key: 'taskKey',
          },
        },
        {
          id: 'node-upsert-orchestration-stats-data-table',
          name: 'Upsert Orchestration Stats DataTable',
          type: 'n8n-nodes-base.dataTable',
          typeVersion: 1,
          position: [1120, 460],
          parameters: {
            operation: 'upsert',
            table: 'Project-bolt2-orchestration-stats',
            data: '={{ [($json.payload || {}).orchestrationStats || (($json.body || {}).payload || {}).orchestrationStats].filter(Boolean) }}',
            key: 'measuredAt',
          },
        },
      ],
      connections: {
        'Ongoing Work Dispatch DataTable Webhook': {
          main: [
            [
              {
                node: 'Ongoing Work Dispatch DataTable Ack',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Ongoing Work Dispatch DataTable Ack': {
          main: [
            [
              {
                node: 'Upsert Open Tasks DataTable',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Upsert Open Tasks DataTable': {
          main: [
            [
              {
                node: 'Upsert Orchestration Stats DataTable',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
      settings: {},
    },
    aliases: ['ongoing-work-dispatch-data-table', 'Project-bolt2-ongoing-work-dispatch-data-table'],
  },
  {
    key: 'task-orchestrator-queue',
    name: 'Project-bolt2-task-orchestrator-queue',
    webhookPath: 'bolt2-task-orchestrator',
    purpose:
      'Data Table backed orchestrator queue: upsert incoming task rows, mark completed tasks, select highest-priority open task, and return callback-aware handoff payload for subflows.',
    activateOnDeploy: true,
    definition: {
      name: 'Project-bolt2-task-orchestrator-queue',
      nodes: [
        {
          id: 'node-task-queue-webhook',
          name: 'Task Queue Webhook',
          webhookId: 'project-bolt2-task-orchestrator-queue',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [260, 680],
          parameters: {
            path: 'bolt2-task-orchestrator',
            httpMethod: 'POST',
            responseMode: 'responseNode',
          },
        },
        {
          id: 'node-has-completed-task',
          name: 'Completed Task?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [500, 680],
          parameters: {
            conditions: {
              string: [
                {
                  value1: '={{ $json.body.completedTaskId || "" }}',
                  operation: 'notEqual',
                  value2: '',
                },
              ],
            },
          },
        },
        {
          id: 'node-mark-completed',
          name: 'Mark Completed Task Row',
          type: 'n8n-nodes-base.dataTable',
          typeVersion: 1,
          position: [740, 580],
          parameters: {
            operation: 'upsert',
            dataTableId: ORCHESTRATION_TASKS_TABLE_NAME,
            matchType: 'allConditions',
            filters: {
              conditions: [
                {
                  keyName: 'taskId',
                  condition: 'eq',
                  keyValue: '={{ $json.body.completedTaskId }}',
                },
              ],
            },
            columns: {
              mappingMode: 'defineBelow',
              value: {
                taskId: '={{ $json.body.completedTaskId }}',
                status: 'completed',
              },
              matchingColumns: ['taskId'],
              attemptToConvertTypes: false,
              convertFieldsToString: false,
            },
            options: {},
          },
          continueOnFail: true,
        },
        {
          id: 'node-upsert-task-row',
          name: 'Upsert Incoming Task Row',
          type: 'n8n-nodes-base.dataTable',
          typeVersion: 1,
          position: [740, 760],
          parameters: {
            operation: 'upsert',
            dataTableId: ORCHESTRATION_TASKS_TABLE_NAME,
            matchType: 'allConditions',
            filters: {
              conditions: [
                {
                  keyName: 'taskId',
                  condition: 'eq',
                  keyValue: '={{ $json.body.task.taskId }}',
                },
              ],
            },
            columns: {
              mappingMode: 'defineBelow',
              value: {
                taskId: '={{ $json.body.task.taskId }}',
                title: '={{ $json.body.task.title }}',
                description: '={{ $json.body.task.description }}',
                priority: '={{ $json.body.task.priority }}',
                status: '={{ $json.body.task.status || "open" }}',
                agent: '={{ $json.body.task.agent || "" }}',
                callbackUrl: '={{ $json.body.task.callbackUrl || $json.body.callbackUrl || "" }}',
                returnAddress: '={{ JSON.stringify($json.body.task.returnAddress || $json.body.returnAddress || {}) }}',
                createdTime: '',
                updatedTime: '={{ $now }}',
              },
              matchingColumns: ['taskId'],
              attemptToConvertTypes: false,
              convertFieldsToString: false,
            },
            options: {},
          },
          continueOnFail: true,
        },
        {
          id: 'node-get-open-tasks',
          name: 'Get Open Task Rows',
          type: 'n8n-nodes-base.dataTable',
          typeVersion: 1,
          position: [980, 760],
          parameters: {
            operation: 'get',
            dataTableId: ORCHESTRATION_TASKS_TABLE_NAME,
            matchType: 'allConditions',
            filters: {
              conditions: [
                {
                  keyName: 'status',
                  condition: 'eq',
                  keyValue: 'open',
                },
              ],
            },
          },
          continueOnFail: true,
        },
        {
          id: 'node-sort-priority',
          name: 'Sort by Priority',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [1220, 760],
          parameters: {
            functionCode: 'const tasks = items\n  .map((item) => item.json)\n  .filter((task) => String(task.status || "").toLowerCase() === "open");\n\ntasks.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));\n\nif (tasks.length === 0) return [{ json: { __empty: true } }];\n\nreturn tasks.map((task) => ({ json: task }));',
          },
        },
        {
          id: 'node-return-next-task',
          name: 'Return Next Task',
          type: 'n8n-nodes-base.function',
          typeVersion: 1,
          position: [1460, 760],
          parameters: {
            functionCode:
              'const source = $input.first()?.json || {};\nconst body = source.body || source || {};\nconst bodyTask = body.task || {};\n\nconst topReturnAddress = body.returnAddress || source.returnAddress || {};\nconst taskReturnAddress = bodyTask.returnAddress || {};\nconst mergedReturnAddress = { ...topReturnAddress, ...taskReturnAddress };\n\nconst hostSelection = String(mergedReturnAddress.hostSelection || mergedReturnAddress.mode || "fqdn").toLowerCase() === "ip" ? "ip" : "fqdn";\nconst selectedHost = hostSelection === "ip"\n  ? (mergedReturnAddress.ip || mergedReturnAddress.host || mergedReturnAddress.fqdn || "")\n  : (mergedReturnAddress.fqdn || mergedReturnAddress.host || mergedReturnAddress.ip || "");\nconst protocol = String(mergedReturnAddress.protocol || "http");\nconst port = mergedReturnAddress.port ? `:${mergedReturnAddress.port}` : "";\nconst pathRaw = String(mergedReturnAddress.path || "/task-push");\nconst path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;\nconst callbackUrl = String(\n  bodyTask.callbackUrl || body.callbackUrl || mergedReturnAddress.url || (selectedHost ? `${protocol}://${selectedHost}${port}${path}` : "")\n);\n\nconst nextTask = Object.keys(bodyTask || {}).length > 0 ? { ...bodyTask } : null;\n\nif (!nextTask) {\n  return [{\n    json: {\n      status: "empty",\n      message: "no incoming task",\n      workflow: "task-orchestrator-queue",\n      nextTask: null,\n      callbackUrl,\n      returnAddress: { ...mergedReturnAddress, hostSelection, host: selectedHost },\n      nextSubflow: "machine-task-push-sync",\n    },\n  }];\n}\n\nconst machineTaskPayload = {\n  taskId: String(nextTask.taskId || `task-${Date.now()}`),\n  text: String(nextTask.title || nextTask.description || "task-push"),\n  callbackUrl,\n  returnAddress: { ...mergedReturnAddress, hostSelection, host: selectedHost },\n  payload: {\n    source: "Project-bolt2-task-orchestrator-queue",\n    nextTask,\n  },\n};\n\nreturn [{\n  json: {\n    status: "ok",\n    workflow: "task-orchestrator-queue",\n    nextTask,\n    callbackUrl,\n    returnAddress: machineTaskPayload.returnAddress,\n    nextSubflow: "machine-task-push-sync",\n    machineTaskPayload,\n  },\n}];',
          },
        },
        {
          id: 'node-orchestrator-respond',
          name: 'Respond Orchestrator Handoff',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [1680, 680],
          parameters: {
            respondWith: 'json',
            responseBody: '={{ $json }}',
            options: {},
          },
        },
      ],
      connections: {
        'Task Queue Webhook': {
          main: [
            [
              {
                node: 'Completed Task?',
                type: 'main',
                index: 0,
              },
              {
                node: 'Return Next Task',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Completed Task?': {
          main: [
            [
              {
                node: 'Mark Completed Task Row',
                type: 'main',
                index: 0,
              },
            ],
            [
              {
                node: 'Upsert Incoming Task Row',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Mark Completed Task Row': {
          main: [
            [
              {
                node: 'Upsert Incoming Task Row',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Upsert Incoming Task Row': {
          main: [
            [
              {
                node: 'Get Open Task Rows',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Get Open Task Rows': {
          main: [
            [
              {
                node: 'Sort by Priority',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Sort by Priority': {
          main: [[]],
        },
        'Return Next Task': {
          main: [
            [
              {
                node: 'Respond Orchestrator Handoff',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
      settings: {},
    },
    aliases: ['task-orchestrator-queue', 'Project-bolt2-task-orchestrator-queue', 'bolt2-task-orchestrator'],
  },
  {
    key: 'ci-publish-watch-sync',
    name: 'Project-bolt2-ci-publish-watch-sync',
    webhookPath: 'ci-publish-watch-sync',
    purpose:
      'Polls GitHub Packages page at +10/+20/+30/+40/+50 minutes for expected image tag publication and posts result to project callback webhook.',
    definition: {
      name: 'Project-bolt2-ci-publish-watch-sync',
      nodes: [
        {
          id: 'node-ci-sync-webhook',
          name: 'CI Publish Watch Sync',
          webhookId: 'project-bolt2-ci-publish-watch-sync',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [320, 260],
          parameters: {
            path: 'ci-publish-watch-sync',
            httpMethod: 'POST',
            responseMode: 'onReceived',
          },
        },
        {
          id: 'node-ci-publish-poll',
          name: 'CI Publish Poll Checker',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [620, 260],
          parameters: {
            jsCode:
              "const payload = $input.first().json || {};\nconst bodyPayload = (payload.body && (payload.body.payload || payload.body)) || payload.payload || payload;\n\nconst commitSha = String(bodyPayload.commitSha || bodyPayload.sha || payload.sha || '').trim();\nconst shortSha = commitSha ? commitSha.slice(0, 7) : String(bodyPayload.shortSha || '').trim();\nconst expectedTag = String(bodyPayload.expectedTag || (shortSha ? `sha-${shortSha}` : '')).trim();\nconst packagePageUrl = String(bodyPayload.packagePageUrl || 'https://github.com/Arvekari?tab=packages&repo_name=Bolt2.dyi').trim();\nconst imageName = String(bodyPayload.imageName || 'ghcr.io/arvekari/ebolt2').trim();\nconst testMode = Boolean(bodyPayload.testMode);\n\nconst returnAddress = bodyPayload.returnAddress || {};\nconst callbackUrlFromPayload = String(bodyPayload.callbackUrl || returnAddress.url || '').trim();\n\nconst protocol = String(returnAddress.protocol || 'http').trim();\nconst hostSelection = String(returnAddress.hostSelection || returnAddress.mode || 'fqdn').trim().toLowerCase() === 'ip' ? 'ip' : 'fqdn';\nconst selectedHost = String(hostSelection === 'ip' ? (returnAddress.ip || returnAddress.host || returnAddress.fqdn || '') : (returnAddress.fqdn || returnAddress.host || returnAddress.ip || '')).trim();\nconst port = String(returnAddress.port || '').trim();\nconst path = String(returnAddress.path || '/publish-status').trim();\nconst normalizedPath = path.startsWith('/') ? path : `/${path}`;\nconst callbackUrl = callbackUrlFromPayload || (selectedHost ? `${protocol}://${selectedHost}${port ? `:${port}` : ''}${normalizedPath}` : '');\n\nconst minuteMarks = testMode ? [0] : [10, 20, 30, 40, 50];\nconst checks = [];\nlet published = false;\nlet lastMinuteMark = 0;\n\nfor (const minuteMark of minuteMarks) {\n  const waitMinutes = Math.max(0, minuteMark - lastMinuteMark);\n  const waitMs = waitMinutes * 60 * 1000;\n\n  if (waitMs > 0) {\n    await new Promise((resolve) => setTimeout(resolve, waitMs));\n  }\n\n  lastMinuteMark = minuteMark;\n\n  let found = false;\n  let fetchError = '';\n\n  try {\n    const controller = new AbortController();\n    const timeoutMs = Number(bodyPayload.fetchTimeoutMs || 15000);\n    const timeout = setTimeout(() => controller.abort(), timeoutMs);\n\n    const response = await fetch(packagePageUrl, {\n      headers: {\n        'User-Agent': 'bolt2-ci-publish-watch-sync',\n      },\n      signal: controller.signal,\n    });\n\n    clearTimeout(timeout);\n    const html = await response.text();\n    found = expectedTag ? html.includes(expectedTag) : false;\n  } catch (error) {\n    fetchError = error instanceof Error ? error.message : String(error);\n  }\n\n  checks.push({\n    minuteMark,\n    found,\n    fetchError,\n    checkedAt: new Date().toISOString(),\n  });\n\n  if (found) {\n    published = true;\n    break;\n  }\n}\n\nconst result = {\n  status: published ? 'published' : 'timeout',\n  workflow: 'ci-publish-watch-sync',\n  commitSha,\n  expectedTag,\n  imageName,\n  packagePageUrl,\n  checks,\n  callbackUrl,\n  callbackPayload: {\n    source: 'Project-bolt2-ci-publish-watch-sync',\n    status: published ? 'published' : 'timeout',\n    commitSha,\n    expectedTag,\n    imageName,\n    packagePageUrl,\n    checks,\n    reportedAt: new Date().toISOString(),\n    testMode,\n    returnAddress: { ...returnAddress, hostSelection, host: selectedHost },\n  },\n};\n\nreturn [{ json: result }];",
          },
        },
        {
          id: 'node-ci-callback-post',
          name: 'Post Publish Result Callback',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [900, 260],
          parameters: {
            method: 'POST',
            url: '={{ $json.callbackUrl }}',
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '={{ JSON.stringify($json.callbackPayload) }}',
            options: {
              timeout: 30000,
            },
          },
          continueOnFail: true,
        },
        {
          id: 'node-ci-sync-ack',
          name: 'CI Sync Ack',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [1140, 260],
          parameters: {
            keepOnlySet: true,
            values: {
              string: [
                {
                  name: 'status',
                  value: 'accepted',
                },
                {
                  name: 'workflow',
                  value: 'ci-publish-watch-sync',
                },
                {
                  name: 'result',
                  value: '={{ $json.status || "published-check-completed" }}',
                },
              ],
            },
          },
        },
      ],
      connections: {
        'CI Publish Watch Sync': {
          main: [
            [
              {
                node: 'CI Publish Poll Checker',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'CI Publish Poll Checker': {
          main: [
            [
              {
                node: 'Post Publish Result Callback',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Post Publish Result Callback': {
          main: [
            [
              {
                node: 'CI Sync Ack',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
      settings: {},
    },
    aliases: ['ci-publish-watch-sync', 'Project-bolt2-ci-publish-watch-sync'],
  },
  {
    key: 'machine-task-push-sync',
    name: 'Project-bolt2-machine-task-push-sync',
    webhookPath: 'machine-task-push-sync',
    purpose:
      'Receives orchestration task events, persists queue row in n8n Data Table, attempts callback delivery to local listener, and returns delivery status with callback diagnostics.',
    definition: {
      name: 'Project-bolt2-machine-task-push-sync',
      nodes: [
        {
          id: 'node-machine-task-push-webhook',
          name: 'Machine Task Push Sync',
          webhookId: 'project-bolt2-machine-task-push-sync',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [300, 540],
          parameters: {
            path: 'machine-task-push-sync',
            httpMethod: 'POST',
            responseMode: 'lastNode',
          },
        },
        {
          id: 'node-machine-task-normalize',
          name: 'Normalize Task Push',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [560, 540],
          parameters: {
            keepOnlySet: false,
            values: {
              string: [
                {
                  name: 'taskId',
                  value:
                    "={{ ($json.taskId || (($json.body || {}).taskId) || (($json.payload || {}).taskId) || (((($json.body || {}).payload) || {}).taskId) || ('task-' + Date.now())) }}",
                },
                {
                  name: 'status',
                  value: 'queued',
                },
                {
                  name: 'sourceWorkflow',
                  value: 'machine-task-push-sync',
                },
                {
                  name: 'callbackUrl',
                  value:
                    "={{ (() => { const body = $json.body || {}; const returnAddress = body.returnAddress || $json.returnAddress || {}; const mode = String(returnAddress.hostSelection || returnAddress.mode || 'fqdn').toLowerCase() === 'ip' ? 'ip' : 'fqdn'; const host = mode === 'ip' ? (returnAddress.ip || returnAddress.host || returnAddress.fqdn || 'localhost') : (returnAddress.fqdn || returnAddress.host || returnAddress.ip || 'localhost'); const protocol = returnAddress.protocol || 'http'; const port = returnAddress.port ? ':' + returnAddress.port : ''; const pathRaw = returnAddress.path || '/task-push'; const path = String(pathRaw).startsWith('/') ? String(pathRaw) : '/' + String(pathRaw); return $json.callbackUrl || body.callbackUrl || returnAddress.url || (protocol + '://' + host + port + path); })() }}",
                },
                {
                  name: 'taskText',
                  value: "={{ ($json.text || (($json.body || {}).text) || (($json.payload || {}).text) || (((($json.body || {}).payload) || {}).text) || (($json.payload || {}).objective) || (((($json.body || {}).payload) || {}).objective) || 'task-push') }}",
                },
                {
                  name: 'queuedAt',
                  value: '={{ $now }}',
                },
              ],
            },
          },
        },
        {
          id: 'node-machine-task-queue-upsert',
          name: 'Queue Machine Task',
          type: 'n8n-nodes-base.dataTable',
          typeVersion: 1,
          position: [820, 540],
          parameters: {
            operation: 'upsert',
            dataTableId: MACHINE_TASK_QUEUE_TABLE_NAME,
            matchType: 'allConditions',
            filters: {
              conditions: [
                {
                  keyName: 'taskId',
                  condition: 'eq',
                  keyValue: '={{ $json.taskId }}',
                },
              ],
            },
            columns: {
              mappingMode: 'defineBelow',
              value: {
                taskId: '={{ $json.taskId }}',
                title: '={{ $json.taskText }}',
                description: '={{ `callback=${$json.callbackUrl}` }}',
                priority: '0',
                status: '={{ $json.status }}',
                agent: '={{ $json.sourceWorkflow }}',
                createdTime: '={{ $json.queuedAt }}',
                updatedTime: '={{ $json.queuedAt }}',
              },
              matchingColumns: ['taskId'],
              attemptToConvertTypes: false,
              convertFieldsToString: false,
            },
            options: {},
          },
          continueOnFail: true,
        },
        {
          id: 'node-machine-task-callback',
          name: 'Deliver Task To Listener',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.2,
          position: [1080, 540],
          parameters: {
            method: 'POST',
            url: '={{ $json.callbackUrl }}',
            sendBody: true,
            specifyBody: 'json',
            jsonBody:
              '={{ JSON.stringify({ source: "Project-bolt2-machine-task-push-sync", status: "queued", taskId: $json.taskId, title: $json.taskText, objective: $json.taskText, payload: $json.payload || $json }) }}',
            options: {
              timeout: 30000,
            },
          },
          continueOnFail: true,
        },
        {
          id: 'node-machine-task-result',
          name: 'Build Machine Task Result',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [1340, 460],
          parameters: {
            keepOnlySet: false,
            values: {
              string: [
                {
                  name: 'deliveryStatus',
                  value: '={{ ((($json.error || {}).message) ? "pending-retry" : "delivered") }}',
                },
                {
                  name: 'deliveryError',
                  value: '={{ (($json.error || {}).message || "") }}',
                },
                {
                  name: 'deliveredAt',
                  value: '={{ $now }}',
                },
              ],
            },
          },
        },
        {
          id: 'node-machine-task-queue-update',
          name: 'Update Machine Task Delivery',
          type: 'n8n-nodes-base.dataTable',
          typeVersion: 1,
          position: [1600, 540],
          parameters: {
            operation: 'upsert',
            dataTableId: MACHINE_TASK_QUEUE_TABLE_NAME,
            matchType: 'allConditions',
            filters: {
              conditions: [
                {
                  keyName: 'taskId',
                  condition: 'eq',
                  keyValue: '={{ $json.taskId }}',
                },
              ],
            },
            columns: {
              mappingMode: 'defineBelow',
              value: {
                taskId: '={{ $json.taskId }}',
                title: '={{ $json.taskText }}',
                description: '={{ (($json.deliveryError || "") ? `callback=${$json.callbackUrl}; error=${$json.deliveryError}` : `callback=${$json.callbackUrl}`) }}',
                priority: '0',
                status: '={{ $json.deliveryStatus || "pending-retry" }}',
                agent: '={{ $json.sourceWorkflow }}',
                createdTime: '={{ $json.queuedAt }}',
                updatedTime: '={{ $json.deliveredAt || $now }}',
              },
              matchingColumns: ['taskId'],
              attemptToConvertTypes: false,
              convertFieldsToString: false,
            },
            options: {},
          },
          continueOnFail: true,
        },
        {
          id: 'node-machine-task-ack',
          name: 'Machine Task Push Ack',
          type: 'n8n-nodes-base.set',
          typeVersion: 1,
          position: [1860, 460],
          parameters: {
            keepOnlySet: true,
            values: {
              string: [
                {
                  name: 'status',
                  value: 'accepted',
                },
                {
                  name: 'workflow',
                  value: 'machine-task-push-sync',
                },
                {
                  name: 'taskId',
                  value: '={{ $json.taskId }}',
                },
                {
                  name: 'deliveryStatus',
                  value: '={{ ((($json.error || {}).message) ? "pending-retry" : "delivered") }}',
                },
                {
                  name: 'callbackUrl',
                  value: '={{ $json.callbackUrl }}',
                },
                {
                  name: 'deliveryError',
                  value: '={{ (($json.error || {}).message || "") }}',
                },
              ],
            },
          },
        },
      ],
      connections: {
        'Machine Task Push Sync': {
          main: [
            [
              {
                node: 'Normalize Task Push',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Normalize Task Push': {
          main: [
            [
              {
                node: 'Queue Machine Task',
                type: 'main',
                index: 0,
              },
              {
                node: 'Deliver Task To Listener',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Deliver Task To Listener': {
          main: [
            [
              {
                node: 'Build Machine Task Result',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Build Machine Task Result': {
          main: [
            [
              {
                node: 'Update Machine Task Delivery',
                type: 'main',
                index: 0,
              },
              {
                node: 'Machine Task Push Ack',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        'Update Machine Task Delivery': {
          main: [[]],
        },
      },
      settings: {},
    },
    aliases: ['machine-task-push-sync', 'Project-bolt2-machine-task-push-sync'],
  },
];

export const MANAGED_WORKFLOWS = WORKFLOWS;

function normalizeWorkflowName(name) {
  if (!name) {
    return '';
  }

  return name.startsWith(WORKFLOW_PREFIX) ? name : `${WORKFLOW_PREFIX}${name}`;
}

function collectBolt2WorkflowNameCandidates() {
  const candidates = new Set();

  for (const spec of WORKFLOWS) {
    candidates.add(spec.name);

    for (const alias of spec.aliases || []) {
      candidates.add(alias);
      candidates.add(normalizeWorkflowName(alias));
    }
  }

  return candidates;
}

function isBolt2WorkflowCandidate(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }

  if (name.startsWith(WORKFLOW_PREFIX)) {
    return true;
  }

  const candidates = collectBolt2WorkflowNameCandidates();
  return candidates.has(name);
}

function sanitizeFileName(name) {
  return String(name || 'workflow').replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function ensureWorkflowRepoDirs() {
  mkdirSync(WORKFLOW_REPO_ACTIVE_DIR, { recursive: true });
  mkdirSync(WORKFLOW_REPO_RETIRED_DIR, { recursive: true });
}

function readRetiredWorkflowNamesFromOngoingWork() {
  if (!existsSync(ONGOING_WORK_FILE)) {
    return [];
  }

  const markdown = readFileSync(ONGOING_WORK_FILE, 'utf8');
  const lines = markdown.split(/\r?\n/);
  const names = [];
  let inSection = false;

  for (const line of lines) {
    if (line.startsWith('## Retired n8n Workflows')) {
      inSection = true;
      continue;
    }

    if (inSection && line.startsWith('## ') && !line.startsWith('## Retired n8n Workflows')) {
      break;
    }

    if (!inSection) {
      continue;
    }

    const backtickMatch = line.match(/`([^`]+)`/);

    if (backtickMatch) {
      names.push(backtickMatch[1].trim());
      continue;
    }

    const nameMatch = line.match(/^\s*-\s*Name:\s*(.+)$/i);

    if (nameMatch) {
      names.push(nameMatch[1].trim());
    }
  }

  return names.filter(Boolean);
}

function parseOngoingObjectives(markdown) {
  const taskIdPrefixPattern = /^\[taskId:\s*([a-zA-Z0-9._:-]+)\]\s*(.*)$/i;
  const lines = markdown.split(/\r?\n/);
  const objectives = [];
  let inPrioritized = false;
  let currentPriority = 'UNSPECIFIED';

  for (const line of lines) {
    if (line.startsWith('## Prioritized Unfinished Work')) {
      inPrioritized = true;
      currentPriority = 'UNSPECIFIED';
      continue;
    }

    if (inPrioritized && line.startsWith('## ') && !line.startsWith('## Prioritized Unfinished Work')) {
      break;
    }

    if (!inPrioritized) {
      continue;
    }

    const priorityMatch = line.match(/^###\s+(P\d+)/);

    if (priorityMatch) {
      currentPriority = priorityMatch[1];
      continue;
    }

    const statusMatch = line.match(/^\s*-\s*`(PARTIAL|TODO|BLOCKED)`\s+(.+)$/);

    if (!statusMatch) {
      continue;
    }

    const rawObjective = statusMatch[2].trim();
    const taskIdMatch = rawObjective.match(taskIdPrefixPattern);
    const taskId = taskIdMatch ? taskIdMatch[1].trim() : '';
    const objectiveText = taskIdMatch ? taskIdMatch[2].trim() : rawObjective;

    if (/^none(\s+currently)?\.?$/i.test(objectiveText)) {
      continue;
    }

    objectives.push({
      priority: currentPriority,
      status: statusMatch[1],
      taskId,
      text: objectiveText,
    });
  }

  return objectives;
}

function readOpenObjectives() {
  if (!existsSync(ONGOING_WORK_FILE)) {
    return [];
  }

  const markdown = readFileSync(ONGOING_WORK_FILE, 'utf8');
  return parseOngoingObjectives(markdown).filter((item) => item.status === 'PARTIAL' || item.status === 'TODO');
}

function normalizeExecutionStatus(execution) {
  return String(execution?.status || '').toLowerCase();
}

function executionDurationMs(execution) {
  const started = execution?.startedAt ? Date.parse(execution.startedAt) : NaN;
  const stopped = execution?.stoppedAt ? Date.parse(execution.stoppedAt) : NaN;

  if (!Number.isFinite(started) || !Number.isFinite(stopped) || stopped < started) {
    return 0;
  }

  return stopped - started;
}

async function fetchExecutions(baseUrl, apiKey, limit = 250) {
  const payload = await apiRequest(baseUrl, apiKey, `/api/v1/executions?limit=${limit}`);
  return Array.isArray(payload?.data) ? payload.data : [];
}

async function resolveManagedWorkflowIds(baseUrl, apiKey) {
  const state = loadState();
  const idsFromState = Object.values(state.workflows || {})
    .map((item) => String(item?.id || '').trim())
    .filter(Boolean);

  if (idsFromState.length > 0) {
    return [...new Set(idsFromState)];
  }

  const all = await listWorkflows(baseUrl, apiKey);
  const managedNames = new Set(WORKFLOWS.map((item) => item.name));
  return all
    .filter((workflow) => managedNames.has(workflow?.name))
    .map((workflow) => String(workflow?.id || '').trim())
    .filter(Boolean);
}

async function collectOrchestrationStats() {
  const { baseUrl, apiKey } = resolveN8nConfig();
  const managedWorkflowIds = new Set(await resolveManagedWorkflowIds(baseUrl, apiKey));
  const executions = await fetchExecutions(baseUrl, apiKey, 250);
  const openObjectives = readOpenObjectives();

  const managedExecutions = executions.filter((execution) => managedWorkflowIds.has(String(execution?.workflowId || '')));
  const productionExecutions = managedExecutions.filter((execution) => String(execution?.mode || '').toLowerCase() === 'webhook');
  const failedProductionExecutions = productionExecutions.filter((execution) => normalizeExecutionStatus(execution) !== 'success');

  const durations = productionExecutions.map(executionDurationMs).filter((value) => value > 0);
  const totalRuntimeMs = durations.reduce((sum, value) => sum + value, 0);
  const averageRuntimeMs = durations.length > 0 ? Math.round(totalRuntimeMs / durations.length) : 0;
  const failureRatePercent =
    productionExecutions.length > 0
      ? Number(((failedProductionExecutions.length / productionExecutions.length) * 100).toFixed(2))
      : 0;

  const manualMinutesPerRun = Number(getEnv('N8N_MANUAL_MINUTES_PER_TASK') || '6');
  const estimatedTimeSavedMinutes = Math.max(0, Math.round(productionExecutions.length * manualMinutesPerRun - totalRuntimeMs / 60000));

  return {
    measuredAt: new Date().toISOString(),
    sampledExecutions: executions.length,
    managedWorkflowIds: [...managedWorkflowIds],
    managedExecutions: managedExecutions.length,
    productionExecutions: productionExecutions.length,
    failedProductionExecutions: failedProductionExecutions.length,
    failureRatePercent,
    averageRuntimeMs,
    estimatedTimeSavedMinutes,
    manualMinutesPerRun,
    openObjectivesCount: openObjectives.length,
  };
}

function buildOpenTaskRows(openObjectives) {
  const now = new Date().toISOString();
  const agentId = resolveAgentIdentity().agentId;

  return openObjectives.map((objective, index) => ({
    taskKey: objective.taskId && objective.taskId.length > 0 ? objective.taskId : `${objective.priority}-${index + 1}`,
    priority: objective.priority,
    status: objective.status,
    objective: objective.text,
    agent: agentId,
    updatedAt: now,
  }));
}

async function tryEnsureDataTable(baseUrl, apiKey, tableName, columns = []) {
  try {
    const payload = await apiRequest(baseUrl, apiKey, '/api/v1/data-tables?limit=100');
    const tables = Array.isArray(payload?.data) ? payload.data : [];
    const existing = tables.find((table) => String(table?.name || '').trim() === tableName);

    if (existing?.id) {
      return {
        supported: true,
        tableId: String(existing.id),
        tableColumns: Array.isArray(existing.columns) ? existing.columns : [],
        created: false,
      };
    }

    const createPayloadCandidates = [
      {
        name: tableName,
        columns,
      },
      { name: tableName },
    ];

    for (const candidate of createPayloadCandidates) {
      try {
        const created = await apiRequest(baseUrl, apiKey, '/api/v1/data-tables', {
          method: 'POST',
          body: JSON.stringify(candidate),
        });

        const createdId = created?.id || created?.data?.id;

        if (createdId) {
          const createdColumns = Array.isArray(created?.columns)
            ? created.columns
            : Array.isArray(created?.data?.columns)
              ? created.data.columns
              : [];

          return {
            supported: true,
            tableId: String(createdId),
            tableColumns: createdColumns,
            created: true,
          };
        }
      } catch {
        // try next payload
      }
    }

    return {
      supported: true,
      tableId: null,
      tableColumns: [],
      created: false,
      warning: 'could not create or resolve data table id',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const unsupported = message.includes('(404)');

    return {
      supported: !unsupported,
      tableId: null,
      tableColumns: [],
      created: false,
      warning: unsupported ? 'data tables api unavailable on this n8n instance' : message,
    };
  }
}

async function resolveDataTableColumns(baseUrl, apiKey, tableIdOrName) {
  if (!tableIdOrName) {
    return [];
  }

  try {
    const payload = await apiRequest(baseUrl, apiKey, '/api/v1/data-tables?limit=200');
    const tables = Array.isArray(payload?.data) ? payload.data : [];
    const target = tables.find(
      (table) => String(table?.id || '') === String(tableIdOrName) || String(table?.name || '') === String(tableIdOrName),
    );

    return Array.isArray(target?.columns) ? target.columns : [];
  } catch {
    return [];
  }
}

async function tryEnsureOpenTasksDataTable(baseUrl, apiKey, tableName) {
  return tryEnsureDataTable(baseUrl, apiKey, tableName, [
    { name: 'taskKey', type: 'string' },
    { name: 'priority', type: 'string' },
    { name: 'status', type: 'string' },
    { name: 'objective', type: 'string' },
    { name: 'agent', type: 'string' },
    { name: 'updatedAt', type: 'string' },
  ]);
}

async function findDataTableByNameOrId(baseUrl, apiKey, candidates) {
  const wanted = new Set(candidates.map((item) => String(item || '').trim()).filter(Boolean));

  if (wanted.size === 0) {
    return null;
  }

  try {
    const payload = await apiRequest(baseUrl, apiKey, '/api/v1/data-tables?limit=200');
    const tables = Array.isArray(payload?.data) ? payload.data : [];
    const match = tables.find((table) => {
      const id = String(table?.id || '').trim();
      const name = String(table?.name || '').trim();
      return wanted.has(id) || wanted.has(name);
    });

    if (!match?.id) {
      return null;
    }

    return {
      id: String(match.id),
      name: String(match?.name || '').trim(),
      columns: Array.isArray(match?.columns) ? match.columns : [],
    };
  } catch {
    return null;
  }
}

function mapOpenTaskRowsToColumns(rows, columns) {
  const known = new Set((columns || []).map((column) => String(column?.name || '').trim()).filter(Boolean));

  if (known.size === 0) {
    return rows;
  }

  return rows.map((row) => {
    const mapped = {};

    if (known.has('taskKey')) mapped.taskKey = row.taskKey;
    if (known.has('taskId')) mapped.taskId = row.taskKey;
    if (known.has('priority')) mapped.priority = row.priority;
    if (known.has('status')) mapped.status = row.status;
    if (known.has('objective')) mapped.objective = row.objective;
    if (known.has('title')) mapped.title = row.objective;
    if (known.has('description')) mapped.description = row.objective;
    if (known.has('agent') && row.agent) mapped.agent = row.agent;
    if (known.has('updatedAt')) mapped.updatedAt = row.updatedAt;
    if (known.has('updatedTime')) mapped.updatedTime = row.updatedAt;
    if (known.has('createdTime')) mapped.createdTime = row.updatedAt;

    return Object.keys(mapped).length > 0 ? mapped : row;
  });
}

function emitOpenTasksFallbackAlert(reason, details = {}) {
  const red = '\u001b[1;31m';
  const reset = '\u001b[0m';
  const banner = `${red}!!! N8N OPEN-TASKS FALLBACK ACTIVE !!!${reset}`;
  console.error(banner);
  console.error(`${red}Reason:${reset} ${reason}`);

  const detailsText = Object.keys(details || {}).length > 0 ? JSON.stringify(details) : '';
  if (detailsText) {
    console.error(`${red}Details:${reset} ${detailsText}`);
  }

  mkdirSync(resolve('bolt.work', 'n8n'), { recursive: true });
  writeFileSync(
    resolve('bolt.work', 'n8n', 'open-tasks-fallback-alert.latest.json'),
    `${JSON.stringify({
      at: new Date().toISOString(),
      reason,
      details,
      level: 'critical',
      message: 'Open tasks are not synced to n8n Data Tables; fallback file mode is active.',
    }, null, 2)}\n`,
    'utf8',
  );
}

async function tryWriteOpenTaskRows(baseUrl, apiKey, tableId, rows) {
  const payloadCandidates = [
    { rows },
    rows,
    { data: rows },
  ];

  const routes = [`/api/v1/data-tables/${encodeURIComponent(String(tableId))}/rows/upsert`, `/api/v1/data-tables/${encodeURIComponent(String(tableId))}/rows`];

  const errors = [];
  for (const route of routes) {
    for (const payload of payloadCandidates) {
      try {
        const response = await apiRequest(baseUrl, apiKey, route, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        return {
          synced: true,
          route,
          payloadShape: Array.isArray(payload) ? 'array' : Object.keys(payload).join(','),
          response,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push({
          route,
          payloadShape: Array.isArray(payload) ? 'array' : Object.keys(payload).join(','),
          error: msg,
        });
      }
    }
  }

  return {
    synced: false,
    warning: 'unable to write rows to data table with known payload shapes',
    attemptErrors: errors,
  };
}

function persistOrchestrationStats(stats) {
  mkdirSync(resolve('bolt.work', 'n8n'), { recursive: true });
  writeFileSync(ORCHESTRATION_STATS_FILE, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');

  return {
    statsFile: ORCHESTRATION_STATS_FILE,
  };
}

function writeFallbackOpenTaskTable(tableName, rows, stats) {
  mkdirSync(resolve('bolt.work', 'n8n'), { recursive: true });

  const fallbackPayload = {
    tableName,
    generatedAt: new Date().toISOString(),
    rows,
    stats,
  };

  writeFileSync(OPEN_TASKS_FALLBACK_FILE, `${JSON.stringify(fallbackPayload, null, 2)}\n`, 'utf8');

  return {
    fallbackFile: OPEN_TASKS_FALLBACK_FILE,
  };
}

async function syncOpenTasksTable(tableName = DEFAULT_OPEN_TASKS_TABLE_NAME) {
  let baseUrl = '';
  let apiKey = '';
  let configWarning = '';

  try {
    const resolved = resolveN8nConfig();
    baseUrl = resolved.baseUrl;
    apiKey = resolved.apiKey;
  } catch (error) {
    configWarning = error instanceof Error ? error.message : String(error);
  }

  const openObjectives = readOpenObjectives();
  const rows = buildOpenTaskRows(openObjectives);
  const explicitOpenTasksTable = resolveOpenTasksTableBinding();
  const targetTable = explicitOpenTasksTable || tableName;
  const stats =
    baseUrl && apiKey
      ? await collectOrchestrationStats()
      : {
          available: false,
          reason: configWarning || 'missing endpoint or api key',
        };
  const persistedStats = persistOrchestrationStats(stats);
  const fallback = writeFallbackOpenTaskTable(targetTable, rows, stats);

  if (!baseUrl || !apiKey) {
    emitOpenTasksFallbackAlert('missing_n8n_config', { warning: configWarning || 'missing endpoint/api key' });
    return {
      tableName: targetTable,
      dataTablesSupported: false,
      warning: configWarning || 'missing n8n endpoint or api key; fallback file updated',
      rowsSynced: 0,
      openObjectives: openObjectives.length,
      stats,
      ...persistedStats,
      ...fallback,
    };
  }

  const tableCheck = await tryEnsureOpenTasksDataTable(baseUrl, apiKey, targetTable);
  let resolvedTableId = tableCheck.tableId ? String(tableCheck.tableId) : '';
  let resolvedTableName = targetTable;
  let resolvedColumns = Array.isArray(tableCheck.tableColumns) ? tableCheck.tableColumns : [];

  if (!resolvedTableId) {
    const orchestrationBinding = resolveOrchestrationTasksTableBinding();
    const fallbackMatch = await findDataTableByNameOrId(baseUrl, apiKey, [
      targetTable,
      orchestrationBinding,
      ORCHESTRATION_TASKS_TABLE_NAME,
      ORCHESTRATION_TASKS_TABLE_FALLBACK_ID,
      ...OPEN_TASKS_TABLE_FALLBACK_NAMES,
    ]);

    if (fallbackMatch) {
      resolvedTableId = fallbackMatch.id;
      resolvedTableName = fallbackMatch.name;
      resolvedColumns = fallbackMatch.columns;
    }
  }

  if (!tableCheck.supported || !resolvedTableId) {
    emitOpenTasksFallbackAlert('open_tasks_table_not_resolvable', {
      requestedTable: targetTable,
      warning: tableCheck.warning || 'data tables unsupported or table not resolvable',
    });
    return {
      tableName: targetTable,
      dataTablesSupported: false,
      warning: tableCheck.warning || 'data tables unsupported or table not resolvable',
      rowsSynced: 0,
      openObjectives: openObjectives.length,
      stats,
      ...persistedStats,
      ...fallback,
    };
  }

  const mappedRows = mapOpenTaskRowsToColumns(rows, resolvedColumns);
  const writeResult = await tryWriteOpenTaskRows(baseUrl, apiKey, resolvedTableId, mappedRows);

  if (!writeResult.synced) {
    emitOpenTasksFallbackAlert('open_tasks_row_write_failed', {
      tableId: resolvedTableId,
      tableName: resolvedTableName,
      warning: writeResult.warning || 'row write failed',
      attemptErrors: writeResult.attemptErrors || [],
    });
    return {
      tableName: targetTable,
      dataTablesSupported: true,
      tableId: resolvedTableId,
      resolvedTableName,
      warning: writeResult.warning,
      rowsSynced: 0,
      openObjectives: openObjectives.length,
      stats,
      attemptErrors: writeResult.attemptErrors || [],
      ...persistedStats,
      ...fallback,
    };
  }

  return {
    tableName: targetTable,
    dataTablesSupported: true,
    tableId: resolvedTableId,
    resolvedTableName,
    created: tableCheck.created,
    rowsSynced: mappedRows.length,
    openObjectives: openObjectives.length,
    writeRoute: writeResult.route,
    stats,
    ...persistedStats,
    ...fallback,
  };
}

function getEnv(key) {
  const value = process.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeAgentPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveAgentIdentity() {
  const explicitAgentId =
    getEnv('BOLT_AGENT_ID') ||
    getEnv('N8N_AGENT_ID') ||
    getEnv('AGENT_ID') ||
    getEnv('COMPUTERNAME') ||
    getEnv('HOSTNAME') ||
    hostname();
  const hostName = getEnv('COMPUTERNAME') || getEnv('HOSTNAME') || hostname();
  const userName = getEnv('USERNAME') || getEnv('USER') || 'unknown-user';

  const normalizedAgentId = sanitizeAgentPart(explicitAgentId) || sanitizeAgentPart(hostName) || 'unknown-agent';

  return {
    agentId: normalizedAgentId,
    hostName,
    userName,
  };
}

function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

function deriveWebhookBaseUrls(endpoint, explicitWebhookBase) {
  const candidates = new Set();
  const normalizedEndpoint = normalizeBaseUrl(endpoint);
  const normalizedWebhook = normalizeBaseUrl(explicitWebhookBase);

  if (normalizedWebhook) {
    candidates.add(normalizedWebhook);
  }

  if (normalizedEndpoint) {
    candidates.add(normalizedEndpoint);
    candidates.add(normalizedEndpoint.replace(/\/api(?:\/v\d+)?$/i, ''));
  }

  return Array.from(candidates).filter(Boolean);
}

function resolveN8nConfig() {
  const endpoint =
    getEnv('N8N_BASE_URL') ||
    getEnv('N8N_ENDPOINT') ||
    getEnv('n8n_base_url') ||
    getEnv('n8n_endpoint') ||
    getEnv('n8n_Arvekari_endpoint');
  const explicitWebhookBase =
    getEnv('N8N_WEBHOOK_BASE_URL') ||
    getEnv('N8N_WEBHOOK_URL') ||
    getEnv('n8n_webhook_base_url') ||
    getEnv('n8n_webhook_url') ||
    getEnv('n8n_Arvekari_webhookEndpoint');
  const apiKey =
    getEnv('N8N_API_KEY') ||
    getEnv('N8N_APIKEY') ||
    getEnv('n8n_api_key') ||
    getEnv('n8n_apikey') ||
    getEnv('n8n_Arvekari_ApiKey');

  if (!endpoint) {
    throw new Error('Missing n8n endpoint: set N8N_BASE_URL/N8N_ENDPOINT or n8n_base_url/n8n_endpoint (legacy: n8n_Arvekari_endpoint).');
  }

  if (!apiKey) {
    throw new Error('Missing n8n API key: set N8N_API_KEY/N8N_APIKEY or n8n_api_key/n8n_apikey (legacy: n8n_Arvekari_ApiKey).');
  }

  return {
    baseUrl: normalizeBaseUrl(endpoint),
    webhookBaseUrls: deriveWebhookBaseUrls(endpoint, explicitWebhookBase),
    apiKey,
  };
}

function resolveMachineTaskQueueTableBinding() {
  const explicit =
    getEnv('N8N_MACHINE_TASK_QUEUE_TABLE_ID') ||
    getEnv('N8N_MACHINE_TASK_QUEUE_TABLE') ||
    getEnv('n8n_Arvekari_machineTaskQueueTableId');

  return explicit || '';
}

function resolveOrchestrationTasksTableBinding() {
  const explicit =
    getEnv('N8N_ORCHESTRATION_TASKS_TABLE_ID') ||
    getEnv('N8N_ORCHESTRATION_TASKS_TABLE') ||
    getEnv('n8n_Arvekari_orchestrationTasksTableId');

  return explicit || '';
}

function resolveOpenTasksTableBinding() {
  const explicit =
    getEnv('N8N_OPEN_TASKS_TABLE_ID') ||
    getEnv('N8N_OPEN_TASKS_TABLE') ||
    getEnv('n8n_Arvekari_openTasksTableId');

  return explicit || '';
}

function envCheck() {
  const endpointPrimary = getEnv('N8N_BASE_URL');
  const endpointPrimaryAlt = getEnv('N8N_ENDPOINT');
  const endpointLower = getEnv('n8n_base_url');
  const endpointLowerAlt = getEnv('n8n_endpoint');
  const endpointLegacy = getEnv('n8n_Arvekari_endpoint');
  const webhookPrimary = getEnv('N8N_WEBHOOK_BASE_URL');
  const webhookPrimaryAlt = getEnv('N8N_WEBHOOK_URL');
  const webhookLower = getEnv('n8n_webhook_base_url');
  const webhookLowerAlt = getEnv('n8n_webhook_url');
  const webhookLegacy = getEnv('n8n_Arvekari_webhookEndpoint');
  const apiKeyPrimary = getEnv('N8N_API_KEY');
  const apiKeyPrimaryAlt = getEnv('N8N_APIKEY');
  const apiKeyLower = getEnv('n8n_api_key');
  const apiKeyLowerAlt = getEnv('n8n_apikey');
  const apiKeyLegacy = getEnv('n8n_Arvekari_ApiKey');

  const endpoint = endpointPrimary || endpointPrimaryAlt || endpointLower || endpointLowerAlt || endpointLegacy;
  const explicitWebhookBase = webhookPrimary || webhookPrimaryAlt || webhookLower || webhookLowerAlt || webhookLegacy;
  const apiKey = apiKeyPrimary || apiKeyPrimaryAlt || apiKeyLower || apiKeyLowerAlt || apiKeyLegacy;

  const diagnostics = {
    ok: Boolean(endpoint && apiKey),
    resolved: {
      endpoint: endpoint ? normalizeBaseUrl(endpoint) : '',
      endpointSource: endpointPrimary
        ? 'N8N_BASE_URL'
        : endpointPrimaryAlt
          ? 'N8N_ENDPOINT'
          : endpointLower
            ? 'n8n_base_url'
            : endpointLowerAlt
              ? 'n8n_endpoint'
              : endpointLegacy
                ? 'n8n_Arvekari_endpoint'
                : 'missing',
      webhookBaseUrl: explicitWebhookBase ? normalizeBaseUrl(explicitWebhookBase) : '',
      webhookBaseSource: webhookPrimary
        ? 'N8N_WEBHOOK_BASE_URL'
        : webhookPrimaryAlt
          ? 'N8N_WEBHOOK_URL'
          : webhookLower
            ? 'n8n_webhook_base_url'
            : webhookLowerAlt
              ? 'n8n_webhook_url'
        : webhookLegacy
          ? 'n8n_Arvekari_webhookEndpoint'
          : 'missing-or-derived',
      apiKeySource: apiKeyPrimary
        ? 'N8N_API_KEY'
        : apiKeyPrimaryAlt
          ? 'N8N_APIKEY'
          : apiKeyLower
            ? 'n8n_api_key'
            : apiKeyLowerAlt
              ? 'n8n_apikey'
              : apiKeyLegacy
                ? 'n8n_Arvekari_ApiKey'
                : 'missing',
      apiKeyPresent: Boolean(apiKey),
      webhookCandidates: endpoint ? deriveWebhookBaseUrls(endpoint, explicitWebhookBase) : [],
    },
    visibility: {
      N8N_BASE_URL: Boolean(endpointPrimary),
      N8N_ENDPOINT: Boolean(endpointPrimaryAlt),
      n8n_base_url: Boolean(endpointLower),
      n8n_endpoint: Boolean(endpointLowerAlt),
      n8n_Arvekari_endpoint: Boolean(endpointLegacy),
      N8N_WEBHOOK_BASE_URL: Boolean(webhookPrimary),
      N8N_WEBHOOK_URL: Boolean(webhookPrimaryAlt),
      n8n_webhook_base_url: Boolean(webhookLower),
      n8n_webhook_url: Boolean(webhookLowerAlt),
      n8n_Arvekari_webhookEndpoint: Boolean(webhookLegacy),
      N8N_API_KEY: Boolean(apiKeyPrimary),
      N8N_APIKEY: Boolean(apiKeyPrimaryAlt),
      n8n_api_key: Boolean(apiKeyLower),
      n8n_apikey: Boolean(apiKeyLowerAlt),
      n8n_Arvekari_ApiKey: Boolean(apiKeyLegacy),
    },
    advice: endpoint && apiKey
      ? 'Environment variables are visible in this terminal.'
      : 'Missing required variables in this terminal. Open a new terminal (or restart VS Code) to load updated system/user env vars.',
  };

  console.log(JSON.stringify(diagnostics, null, 2));
}

async function apiRequest(baseUrl, apiKey, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const parsed = text ? safeJsonParse(text) : {};

  if (!response.ok) {
    const detail = typeof parsed === 'object' && parsed && 'message' in parsed ? parsed.message : text;
    throw new Error(`n8n API ${options.method || 'GET'} ${path} failed (${response.status}): ${detail}`);
  }

  return parsed;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function loadState() {
  if (!existsSync(STATE_FILE)) {
    return { workflows: {} };
  }

  const parsed = safeJsonParse(readFileSync(STATE_FILE, 'utf8'));

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { workflows: {} };
  }

  return {
    workflows: typeof parsed.workflows === 'object' && parsed.workflows && !Array.isArray(parsed.workflows) ? parsed.workflows : {},
  };
}

function saveState(state) {
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

async function listWorkflows(baseUrl, apiKey) {
  const payload = await apiRequest(baseUrl, apiKey, '/api/v1/workflows?limit=250');
  return Array.isArray(payload?.data) ? payload.data : [];
}

function normalizeWorkflowPayload(definition, existing) {
  return {
    name: definition.name,
    nodes: definition.nodes,
    connections: definition.connections,
    settings: definition.settings || {},
  };
}

async function createWorkflow(baseUrl, apiKey, payload) {
  return await apiRequest(baseUrl, apiKey, '/api/v1/workflows', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function updateWorkflow(baseUrl, apiKey, workflowId, payload) {
  return await apiRequest(baseUrl, apiKey, `/api/v1/workflows/${encodeURIComponent(String(workflowId))}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

async function fetchWorkflow(baseUrl, apiKey, workflowId) {
  return await apiRequest(baseUrl, apiKey, `/api/v1/workflows/${encodeURIComponent(String(workflowId))}`, {
    method: 'GET',
  });
}

function backupWorkflowJson(workflow, bucket = 'active') {
  ensureWorkflowRepoDirs();

  const destinationDir = bucket === 'retired' ? WORKFLOW_REPO_RETIRED_DIR : WORKFLOW_REPO_ACTIVE_DIR;
  const name = sanitizeFileName(workflow?.name || workflow?.id || 'workflow');
  const latestPath = resolve(destinationDir, `${name}.json`);
  const timestampPath = resolve(destinationDir, `${name}-${Date.now()}.json`);
  const content = `${JSON.stringify(workflow, null, 2)}\n`;

  writeFileSync(latestPath, content, 'utf8');
  writeFileSync(timestampPath, content, 'utf8');
}

async function deleteWorkflow(baseUrl, apiKey, workflowId) {
  await apiRequest(baseUrl, apiKey, `/api/v1/workflows/${encodeURIComponent(String(workflowId))}`, {
    method: 'DELETE',
  });
}

async function setWorkflowActive(baseUrl, apiKey, workflowId, active) {
  const route = active ? 'activate' : 'deactivate';

  try {
    await apiRequest(baseUrl, apiKey, `/api/v1/workflows/${encodeURIComponent(String(workflowId))}/${route}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return;
  } catch {
    await apiRequest(baseUrl, apiKey, `/api/v1/workflows/${encodeURIComponent(String(workflowId))}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  }
}

async function archiveWorkflow(baseUrl, apiKey, workflow) {
  await apiRequest(baseUrl, apiKey, `/api/v1/workflows/${encodeURIComponent(String(workflow.id))}`, {
    method: 'PATCH',
    body: JSON.stringify({
      active: false,
      isArchived: true,
    }),
  });
}

async function pruneRetired() {
  const { baseUrl, apiKey } = resolveN8nConfig();
  const all = await listWorkflows(baseUrl, apiKey);
  const retiredNames = new Set([...RETIRED_WORKFLOW_NAMES, ...readRetiredWorkflowNamesFromOngoingWork()]);
  const retired = all.filter((workflow) => retiredNames.has(workflow?.name));

  if (retired.length === 0) {
    console.log('No retired workflows found.');
    return;
  }

  for (const workflow of retired) {
    const workflowId = workflow?.id;
    const workflowName = workflow?.name || 'unknown';

    if (!workflowId) {
      console.log(`SKIP ${workflowName} (missing id)`);
      continue;
    }

    try {
      const details = await fetchWorkflow(baseUrl, apiKey, workflowId);
      backupWorkflowJson(details, 'retired');
    } catch (backupError) {
      const backupMessage = backupError instanceof Error ? backupError.message : String(backupError);
      console.log(`BACKUP_FAILED ${workflowName} id=${workflowId} reason=${backupMessage}`);
    }

    try {
      await deleteWorkflow(baseUrl, apiKey, workflowId);
      console.log(`REMOVED ${workflowName} id=${workflowId}`);
      continue;
    } catch (deleteError) {
      const deleteMessage = deleteError instanceof Error ? deleteError.message : String(deleteError);
      console.log(`DELETE_FAILED ${workflowName} id=${workflowId} reason=${deleteMessage}`);
    }

    try {
      await setWorkflowActive(baseUrl, apiKey, workflowId, false);
    } catch {
      // Continue to archive attempt.
    }

    try {
      await archiveWorkflow(baseUrl, apiKey, workflow);
      console.log(`ARCHIVED ${workflowName} id=${workflowId}`);
    } catch (archiveError) {
      const archiveMessage = archiveError instanceof Error ? archiveError.message : String(archiveError);
      console.log(`ARCHIVE_FAILED ${workflowName} id=${workflowId} reason=${archiveMessage}`);
    }
  }
}

async function enforcePrefixGuardrail() {
  const { baseUrl, apiKey } = resolveN8nConfig();
  const all = await listWorkflows(baseUrl, apiKey);
  const retiredNames = new Set([...RETIRED_WORKFLOW_NAMES, ...readRetiredWorkflowNamesFromOngoingWork()]);

  const violations = all.filter((workflow) => {
    const name = workflow?.name;

    if (!isBolt2WorkflowCandidate(name)) {
      return false;
    }

    if (retiredNames.has(name)) {
      return false;
    }

    return !name.startsWith(WORKFLOW_PREFIX);
  });

  if (violations.length > 0) {
    const details = violations.map((item) => `${item.name} (${item.id})`).join(', ');
    throw new Error(
      `Guardrail violation: bolt2 workflows must start with '${WORKFLOW_PREFIX}'. Violations: ${details}. ` +
        `Rename/redeploy workflows or mark retired and prune with 'pnpm run n8n:orchestrator -- prune-retired'.`,
    );
  }

  console.log(`GUARDRAIL_OK all bolt2 workflows use prefix '${WORKFLOW_PREFIX}'.`);
}

async function deployAll({ activate }) {
  const { baseUrl, apiKey } = resolveN8nConfig();
  const all = await listWorkflows(baseUrl, apiKey);
  const state = {
    workflows: {},
  };
  const now = new Date().toISOString();

  for (const spec of WORKFLOWS) {
    const aliasNames = (spec.aliases || [spec.name]).map((item) => normalizeWorkflowName(item));
    const legacyNames = spec.aliases || [spec.name];
    const existing = all.find((workflow) => aliasNames.includes(workflow?.name) || legacyNames.includes(workflow?.name));
    const definition = JSON.parse(JSON.stringify(spec.definition));

    if (spec.key === 'machine-task-push-sync') {
      const tableCheck = await tryEnsureDataTable(baseUrl, apiKey, MACHINE_TASK_QUEUE_TABLE_NAME, MACHINE_TASK_QUEUE_TABLE_COLUMNS);
      const explicitQueueTableId = resolveMachineTaskQueueTableBinding();
      const resolvedQueueTableId = explicitQueueTableId || tableCheck.tableId || (!tableCheck.supported ? MACHINE_TASK_QUEUE_TABLE_FALLBACK_ID : '');

      if (!resolvedQueueTableId) {
        const requiredColumns = MACHINE_TASK_QUEUE_TABLE_COLUMNS.map((column) => column.name).join(', ');
        throw new Error(
          `Unable to resolve Data Table '${MACHINE_TASK_QUEUE_TABLE_NAME}' for ${spec.name}. ` +
            `Required columns for dedicated queue table: ${requiredColumns}. Details: ${tableCheck.warning || 'table id missing'}`,
        );
      }

      if (!tableCheck.tableId && !tableCheck.supported) {
        console.log(
          `DATATABLE_COMPAT_FALLBACK ${spec.name} using '${resolvedQueueTableId}' because Data Tables API is unavailable (${tableCheck.warning || 'unknown reason'}).`,
        );
      }

      if (explicitQueueTableId) {
        console.log(`DATATABLE_BINDING_OVERRIDE ${spec.name} using table binding '${explicitQueueTableId}' from environment.`);
      }

      const queueColumns =
        Array.isArray(tableCheck.tableColumns) && tableCheck.tableColumns.length > 0
          ? tableCheck.tableColumns
          : await resolveDataTableColumns(baseUrl, apiKey, resolvedQueueTableId);
      const queueTaskIdFilterKey =
        queueColumns.find((column) => String(column?.name || '').trim() === 'taskId')?.id || 'taskId';

      for (const node of definition.nodes || []) {
        if (node?.type === 'n8n-nodes-base.dataTable' && node?.id?.startsWith('node-machine-task-')) {
          node.parameters = {
            ...(node.parameters || {}),
            dataTableId: String(resolvedQueueTableId),
          };

          if (Array.isArray(node?.parameters?.filters?.conditions)) {
            node.parameters.filters.conditions = node.parameters.filters.conditions.map((condition) => {
              if (String(condition?.keyName || '').trim() === 'taskId') {
                return {
                  ...condition,
                  keyName: String(queueTaskIdFilterKey),
                };
              }

              return condition;
            });
          }
        }
      }
    }

    if (spec.key === 'task-orchestrator-queue') {
      const tableCheck = await tryEnsureDataTable(baseUrl, apiKey, ORCHESTRATION_TASKS_TABLE_NAME, ORCHESTRATION_TASKS_TABLE_COLUMNS);
      const explicitOrchestrationTableId = resolveOrchestrationTasksTableBinding();
      const resolvedOrchestrationTableId =
        explicitOrchestrationTableId || tableCheck.tableId || (!tableCheck.supported ? ORCHESTRATION_TASKS_TABLE_FALLBACK_ID : '');

      if (!resolvedOrchestrationTableId) {
        const requiredColumns = ORCHESTRATION_TASKS_TABLE_COLUMNS.map((column) => column.name).join(', ');
        throw new Error(
          `Unable to resolve Data Table '${ORCHESTRATION_TASKS_TABLE_NAME}' for ${spec.name}. ` +
            `Required columns: ${requiredColumns}. Details: ${tableCheck.warning || 'table id missing'}`,
        );
      }

      if (!tableCheck.tableId && !tableCheck.supported) {
        console.log(
          `DATATABLE_COMPAT_FALLBACK ${spec.name} using '${resolvedOrchestrationTableId}' because Data Tables API is unavailable (${tableCheck.warning || 'unknown reason'}).`,
        );
      }

      if (explicitOrchestrationTableId) {
        console.log(`DATATABLE_BINDING_OVERRIDE ${spec.name} using table binding '${explicitOrchestrationTableId}' from environment.`);
      }

      const orchestrationColumns =
        Array.isArray(tableCheck.tableColumns) && tableCheck.tableColumns.length > 0
          ? tableCheck.tableColumns
          : await resolveDataTableColumns(baseUrl, apiKey, resolvedOrchestrationTableId);
      const orchestrationTitleFilterKey =
        orchestrationColumns.find((column) => String(column?.name || '').trim() === 'title')?.id || 'title';
      const orchestrationTaskIdFilterKey =
        orchestrationColumns.find((column) => String(column?.name || '').trim() === 'taskId')?.id || 'taskId';
      const orchestrationStatusFilterKey =
        orchestrationColumns.find((column) => String(column?.name || '').trim() === 'status')?.id || 'status';

      for (const node of definition.nodes || []) {
        if (node?.type === 'n8n-nodes-base.dataTable' && node?.id?.startsWith('node-') && String(node?.name || '').includes('Task')) {
          node.parameters = {
            ...(node.parameters || {}),
            dataTableId: String(resolvedOrchestrationTableId),
          };

          if (Array.isArray(node?.parameters?.filters?.conditions)) {
            node.parameters.filters.conditions = node.parameters.filters.conditions.map((condition) => {
              const rawKey = String(condition?.keyName || '').trim();

              if (rawKey === 'title') {
                return {
                  ...condition,
                  keyName: String(orchestrationTitleFilterKey),
                };
              }

              if (rawKey === 'taskId') {
                return {
                  ...condition,
                  keyName: String(orchestrationTaskIdFilterKey),
                };
              }

              if (rawKey === 'status') {
                return {
                  ...condition,
                  keyName: String(orchestrationStatusFilterKey),
                };
              }

              return condition;
            });
          }
        }
      }
    }

    const payload = normalizeWorkflowPayload(definition, existing);
    let saved;

    if (existing) {
      try {
        saved = await updateWorkflow(baseUrl, apiKey, existing.id, payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        if (message.toLowerCase().includes('archived workflow')) {
          saved = await createWorkflow(baseUrl, apiKey, payload);
          console.log(`RECREATED ${spec.name} because existing workflow was archived (old id=${existing.id})`);
        } else {
          throw error;
        }
      }
    } else {
      saved = await createWorkflow(baseUrl, apiKey, payload);
    }

    const workflowId = String(saved?.id || existing?.id || '');

    if (!workflowId) {
      throw new Error(`Unable to resolve workflow id for ${spec.name}`);
    }

    const shouldActivate = Boolean(activate) && spec.activateOnDeploy !== false;

    if (shouldActivate) {
      await setWorkflowActive(baseUrl, apiKey, workflowId, true);
    } else {
      await setWorkflowActive(baseUrl, apiKey, workflowId, false);
    }

    state.workflows[spec.key] = {
      id: workflowId,
      name: spec.name,
      purpose: spec.purpose,
      webhookPath: spec.webhookPath,
      active: shouldActivate,
      deployedAt: now,
    };

    console.log(`${existing ? 'UPDATED' : 'CREATED'} ${spec.name} id=${workflowId} active=${shouldActivate}`);

    try {
      const details = await fetchWorkflow(baseUrl, apiKey, workflowId);
      backupWorkflowJson(details, 'active');
    } catch (backupError) {
      const backupMessage = backupError instanceof Error ? backupError.message : String(backupError);
      console.log(`ACTIVE_BACKUP_FAILED ${spec.name} id=${workflowId} reason=${backupMessage}`);
    }
  }

  saveState(state);
  console.log(`STATE_FILE=${STATE_FILE}`);
}

async function listManaged() {
  const state = loadState();
  const managed = WORKFLOWS.map((item) => {
    const saved = state.workflows[item.key];

    return {
      key: item.key,
      name: item.name,
      id: saved?.id || 'not-deployed',
      webhookPath: item.webhookPath,
      purpose: item.purpose,
      active: saved?.active ?? false,
      deployedAt: saved?.deployedAt || null,
    };
  });

  console.log(JSON.stringify({ managed }, null, 2));
}

async function setAllActive(active) {
  const { baseUrl, apiKey } = resolveN8nConfig();
  const state = loadState();

  for (const spec of WORKFLOWS) {
    if (active && spec.activateOnDeploy === false) {
      const saved = state.workflows[spec.key];

      if (saved) {
        saved.active = false;
        saved.updatedAt = new Date().toISOString();
      }

      console.log(`SKIPPED ${spec.name} activateOnDeploy=false`);
      continue;
    }

    const saved = state.workflows[spec.key];

    if (!saved?.id) {
      throw new Error(`Workflow ${spec.name} has no saved id; run deploy first.`);
    }

    await setWorkflowActive(baseUrl, apiKey, saved.id, active);
    saved.active = active;
    saved.updatedAt = new Date().toISOString();
    console.log(`${active ? 'ACTIVATED' : 'DEACTIVATED'} ${spec.name} id=${saved.id}`);
  }

  saveState(state);
}

async function triggerWorkflow(key, payload) {
  const { webhookBaseUrls, apiKey } = resolveN8nConfig();
  const spec = WORKFLOWS.find((item) => item.key === key || item.name === key);

  if (!spec) {
    throw new Error(`Unknown workflow key/name: ${key}`);
  }

  const pathTargets = [`/webhook/${spec.webhookPath}`, `/webhook-prod/${spec.webhookPath}`];
  const attempts = [];

  for (const baseUrlCandidate of webhookBaseUrls) {
    for (const pathTarget of pathTargets) {
      const targetUrl = `${baseUrlCandidate}${pathTarget}`;
      attempts.push(targetUrl);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload || {}),
      });

      const text = await response.text();
      console.log(`TRIGGER_URL=${targetUrl}`);
      console.log(`TRIGGER_STATUS=${response.status}`);
      console.log(`TRIGGER_BODY=${text}`);

      if (response.ok) {
        return;
      }
    }
  }

  throw new Error(`Trigger failed for ${spec.name}. Attempted URLs: ${attempts.join(', ')}`);
}

function parseArgs(argv) {
  const args = {
    command: argv[0] || 'list',
    activate: true,
    key: '',
    payload: {},
    table: DEFAULT_OPEN_TASKS_TABLE_NAME,
  };

  for (let index = 1; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === '--inactive') {
      args.activate = false;
    } else if (arg === '--key' && argv[index + 1]) {
      args.key = argv[++index];
    } else if (arg === '--payload' && argv[index + 1]) {
      args.payload = safeJsonParse(argv[++index]);
    } else if (arg === '--table' && argv[index + 1]) {
      args.table = argv[++index];
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'deploy') {
    await pruneRetired();
    await deployAll({ activate: args.activate });
    await enforcePrefixGuardrail();
    return;
  }

  if (args.command === 'list') {
    await listManaged();
    return;
  }

  if (args.command === 'activate') {
    await setAllActive(true);
    return;
  }

  if (args.command === 'deactivate') {
    await setAllActive(false);
    return;
  }

  if (args.command === 'trigger') {
    if (!args.key) {
      throw new Error('trigger requires --key <workflow-key-or-name>.');
    }

    await triggerWorkflow(args.key, args.payload);
    return;
  }

  if (args.command === 'prune-retired') {
    await pruneRetired();
    return;
  }

  if (args.command === 'guardrail') {
    await enforcePrefixGuardrail();
    return;
  }

  if (args.command === 'stats') {
    const stats = await collectOrchestrationStats();
    const persistedStats = persistOrchestrationStats(stats);
    console.log(JSON.stringify({
      ...stats,
      ...persistedStats,
    }, null, 2));
    return;
  }

  if (args.command === 'sync-open-tasks') {
    const result = await syncOpenTasksTable(args.table);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (args.command === 'env-check') {
    envCheck();
    return;
  }

  throw new Error(`Unsupported command: ${args.command}`);
}

const entryPoint = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;

if (entryPoint && import.meta.url === entryPoint) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`n8n-dev-orchestrator error: ${message}`);
    process.exit(1);
  });
}
