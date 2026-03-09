#!/usr/bin/env node

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { resolveListenerConfigPathForAgent } from './listener-config-resolution.mjs';

const FILE_PATH = resolve('.ongoing-work.md');
const CHANGELOG_PATH = resolve('changelog.md');
const LOOP_STATE = resolve('.n8n-ongoing-cycle.json');
const LOOP_LOG = resolve('bolt.work/n8n/copilot-inbox/cycle.log');
const ORCHESTRATOR_STATE = resolve('.n8n-dev-workflows.json');
const ORCHESTRATION_STATS_FILE = resolve('bolt.work/n8n/orchestration-stats.latest.json');
const OPEN_TASKS_FALLBACK_FILE = resolve('bolt.work/n8n/open-tasks-table.json');
const TASK_STATUS_TABLE_MAX_ROWS = 100;
const EMPTY_SCAN_STOP_THRESHOLD = 2;
const TASK_ID_PREFIX_PATTERN = /^\[taskId:\s*([a-zA-Z0-9._:-]+)\]\s*(.*)$/i;
const ORCHESTRATION_TABLE_CANDIDATE_NAMES = ['Project-bolt2-orchestration-tasks', 'orchestration_tasks', 'WwKV0LTmzJj87mm0'];

function readMarkdown() {
  return readFileSync(FILE_PATH, 'utf8');
}

function parseObjectives(markdown) {
  const lines = markdown.split(/\r?\n/);
  const objectives = [];
  let inPrioritized = false;
  let currentPriority = '';

  for (const line of lines) {
    if (line.startsWith('## Prioritized Unfinished Work')) {
      inPrioritized = true;
      currentPriority = '';
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

    const entry = line.match(/^\s*-\s*`(PARTIAL|TODO|BLOCKED)`\s+(.+)$/);

    if (!entry) {
      continue;
    }

    const taskIdMatch = entry[2].trim().match(TASK_ID_PREFIX_PATTERN);
    const taskId = taskIdMatch ? taskIdMatch[1] : '';
    const objectiveText = taskIdMatch ? taskIdMatch[2].trim() : entry[2].trim();

    if (/^none\.?$/i.test(objectiveText)) {
      continue;
    }

    objectives.push({
      priority: currentPriority || 'UNSPECIFIED',
      status: entry[1],
      taskId,
      text: objectiveText,
    });
  }

  return objectives;
}

function parseObjectivesAllStatuses(markdown) {
  const lines = markdown.split(/\r?\n/);
  const objectives = [];
  let inPrioritized = false;
  let currentPriority = '';

  for (const line of lines) {
    if (line.startsWith('## Prioritized Unfinished Work')) {
      inPrioritized = true;
      currentPriority = '';
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

    const entry = line.match(/^\s*-\s*`(PARTIAL|TODO|BLOCKED|DONE)`\s+(.+)$/);

    if (!entry) {
      continue;
    }

    const taskIdMatch = entry[2].trim().match(TASK_ID_PREFIX_PATTERN);
    const taskId = taskIdMatch ? taskIdMatch[1] : '';
    const objectiveText = taskIdMatch ? taskIdMatch[2].trim() : entry[2].trim();

    if (/^none\.?$/i.test(objectiveText)) {
      continue;
    }

    objectives.push({
      priority: currentPriority || 'UNSPECIFIED',
      status: entry[1],
      taskId,
      text: objectiveText,
    });
  }

  return objectives;
}

function readOrchestrationPolicy(markdown) {
  const lines = markdown.split(/\r?\n/);
  let inSection = false;
  let mode = 'AUTO';
  let exception = 'OFF';
  let confirmationRequired = false;
  let reason = '';

  for (const line of lines) {
    if (line.startsWith('## Orchestration Enforcement')) {
      inSection = true;
      continue;
    }

    if (inSection && line.startsWith('## ') && !line.startsWith('## Orchestration Enforcement')) {
      break;
    }

    if (!inSection) {
      continue;
    }

    const modeMatch = line.match(/^\s*-\s*Mode:\s*(AUTO|AUTONOMOUS|REQUIRED|EXCEPTION)\s*$/i);

    if (modeMatch) {
      mode = modeMatch[1].toUpperCase() === 'AUTONOMOUS' ? 'AUTO' : modeMatch[1].toUpperCase();
      continue;
    }

    const exceptionMatch = line.match(/^\s*-\s*Exception:\s*(ON|OFF)\s*$/i);

    if (exceptionMatch) {
      exception = exceptionMatch[1].toUpperCase();
      continue;
    }

    const reasonMatch = line.match(/^\s*-\s*ExceptionReason:\s*(.*)$/i);

    if (reasonMatch) {
      reason = reasonMatch[1].trim();
      continue;
    }

    const confirmationMatch = line.match(/^\s*-\s*ConfirmationRequired:\s*(ON|OFF|TRUE|FALSE)\s*$/i);

    if (confirmationMatch) {
      const normalized = confirmationMatch[1].toUpperCase();
      confirmationRequired = normalized === 'ON' || normalized === 'TRUE';
    }
  }

  const exceptionEnabled = mode === 'EXCEPTION' || exception === 'ON';

  return {
    mode,
    exception: exceptionEnabled ? 'ON' : 'OFF',
    exceptionEnabled,
    confirmationRequired,
    exceptionReason: reason,
  };
}

function nextObjective(objectives) {
  return objectives.find((item) => item.status === 'PARTIAL') || objectives.find((item) => item.status === 'TODO') || null;
}

function extractTaskIdFromDoneText(text) {
  const value = String(text || '').trim();

  if (value.length === 0) {
    return '';
  }

  const explicit = value.match(/\[taskId:\s*([a-zA-Z0-9._:-]+)\]/i);

  if (explicit) {
    return explicit[1].trim();
  }

  const parenthesized = [...value.matchAll(/\(([a-zA-Z0-9._:-]+)\)/g)]
    .map((match) => String(match[1] || '').trim())
    .filter(Boolean);

  if (parenthesized.length === 0) {
    return '';
  }

  return parenthesized.find((item) => item.includes('-')) || parenthesized[0];
}

function objectiveIdentity(objective) {
  if (!objective) {
    return '';
  }

  if (objective.taskId && String(objective.taskId).trim().length > 0) {
    return `task:${String(objective.taskId).trim().toLowerCase()}`;
  }

  return `text:${sanitizeRefPart(objective.priority)}:${sanitizeRefPart(objective.text)}`;
}

function resolveNextObjectiveForExecution(state, objectives) {
  const actionable = objectives.filter((item) => item.status === 'PARTIAL' || item.status === 'TODO');

  if (actionable.length === 0) {
    state.activeObjectiveId = '';
    return {
      next: null,
      continuingActive: false,
    };
  }

  const activeObjectiveId = String(state.activeObjectiveId || '').trim();

  if (activeObjectiveId.length > 0) {
    const active = actionable.find((item) => objectiveIdentity(item) === activeObjectiveId);

    if (active) {
      return {
        next: active,
        continuingActive: true,
      };
    }
  }

  const selected = nextObjective(actionable);
  state.activeObjectiveId = selected ? objectiveIdentity(selected) : '';

  return {
    next: selected,
    continuingActive: false,
  };
}

function markObjectiveStatusInMarkdown(targetObjective, targetStatus) {
  if (!targetObjective) {
    return { updated: false, reason: 'missing objective' };
  }

  const normalizedStatus = String(targetStatus || '').trim().toUpperCase();

  if (!['DONE', 'PARTIAL', 'TODO', 'BLOCKED'].includes(normalizedStatus)) {
    return { updated: false, reason: `unsupported status '${targetStatus}'` };
  }

  const markdown = readMarkdown();
  const lines = markdown.split(/\r?\n/);
  let inPrioritized = false;
  let updated = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (line.startsWith('## Prioritized Unfinished Work')) {
      inPrioritized = true;
      continue;
    }

    if (inPrioritized && line.startsWith('## ') && !line.startsWith('## Prioritized Unfinished Work')) {
      break;
    }

    if (!inPrioritized) {
      continue;
    }

    const statusMatch = line.match(/^(\s*-\s*)`(PARTIAL|TODO|BLOCKED|DONE)`\s+(.+)$/);

    if (!statusMatch) {
      continue;
    }

    const taskData = statusMatch[3].trim().match(TASK_ID_PREFIX_PATTERN);
    const lineTaskId = taskData ? taskData[1] : '';
    const lineText = taskData ? taskData[2].trim() : statusMatch[3].trim();
    const taskIdMatches =
      targetObjective.taskId && lineTaskId
        ? String(targetObjective.taskId).trim().toLowerCase() === String(lineTaskId).trim().toLowerCase()
        : false;
    const textMatches = !targetObjective.taskId && lineText === targetObjective.text;

    if (!taskIdMatches && !textMatches) {
      continue;
    }

    if (statusMatch[2] !== normalizedStatus) {
      lines[index] = `${statusMatch[1]}\`${normalizedStatus}\` ${statusMatch[3]}`;
      updated = true;
    }

    break;
  }

  if (updated) {
    writeFileSync(FILE_PATH, `${lines.join('\n')}\n`, 'utf8');
  }

  return {
    updated,
    reason: updated ? '' : 'objective line not changed',
  };
}

function markObjectiveDoneInMarkdown(doneObjective) {
  if (!doneObjective) {
    return { updated: false, reason: 'missing objective' };
  }

  return markObjectiveStatusInMarkdown(doneObjective, 'DONE');
}

function appendDoneObjectiveToChangelog(doneObjective, doneText) {
  if (!existsSync(CHANGELOG_PATH)) {
    return { updated: false, reason: 'changelog-missing' };
  }

  const taskId = String(doneObjective?.taskId || '').trim();
  const objectiveText = String(doneText || doneObjective?.text || '').trim();

  if (!objectiveText) {
    return { updated: false, reason: 'missing-objective-text' };
  }

  const entry = taskId ? `- Completed [taskId: ${taskId}] ${objectiveText}.` : `- Completed ${objectiveText}.`;
  const changelog = readFileSync(CHANGELOG_PATH, 'utf8');

  if (taskId && changelog.toLowerCase().includes(`[taskid: ${taskId.toLowerCase()}]`)) {
    return { updated: false, reason: 'already-logged', entry };
  }

  const lines = changelog.split(/\r?\n/);
  const unreleasedStart = lines.findIndex((line) => /^##\s+\[Unreleased\]/i.test(line));

  if (unreleasedStart === -1) {
    return { updated: false, reason: 'unreleased-section-missing', entry };
  }

  let unreleasedEnd = lines.length;

  for (let index = unreleasedStart + 1; index < lines.length; index++) {
    if (/^##\s+\[.+\]/.test(lines[index])) {
      unreleasedEnd = index;
      break;
    }
  }

  let changedHeaderIndex = -1;

  for (let index = unreleasedStart + 1; index < unreleasedEnd; index++) {
    if (/^###\s+Changed\s*$/i.test(lines[index])) {
      changedHeaderIndex = index;
      break;
    }
  }

  if (changedHeaderIndex === -1) {
    const insertAt = unreleasedEnd;
    lines.splice(insertAt, 0, '', '### Changed', '', entry);
  } else {
    let insertAt = changedHeaderIndex + 1;

    while (insertAt < unreleasedEnd && lines[insertAt].trim() === '') {
      insertAt += 1;
    }

    while (insertAt < unreleasedEnd && /^-\s+/.test(lines[insertAt])) {
      insertAt += 1;
    }

    lines.splice(insertAt, 0, entry);
  }

  writeFileSync(CHANGELOG_PATH, `${lines.join('\n')}\n`, 'utf8');
  return { updated: true, reason: '', entry };
}

function cleanupDoneObjectivesInMarkdown(taskId = '') {
  const markdown = readMarkdown();
  const lines = markdown.split(/\r?\n/);
  const normalizedTaskId = String(taskId || '').trim().toLowerCase();
  let inPrioritized = false;
  let updated = false;
  const kept = [];

  for (const line of lines) {
    if (line.startsWith('## Prioritized Unfinished Work')) {
      inPrioritized = true;
      kept.push(line);
      continue;
    }

    if (inPrioritized && line.startsWith('## ') && !line.startsWith('## Prioritized Unfinished Work')) {
      inPrioritized = false;
      kept.push(line);
      continue;
    }

    if (!inPrioritized) {
      kept.push(line);
      continue;
    }

    const doneMatch = line.match(/^\s*-\s*`DONE`\s+(.+)$/);

    if (!doneMatch) {
      kept.push(line);
      continue;
    }

    const taskData = doneMatch[1].trim().match(TASK_ID_PREFIX_PATTERN);
    const lineTaskId = taskData ? taskData[1].trim().toLowerCase() : '';
    const removeLine = normalizedTaskId ? lineTaskId === normalizedTaskId : true;

    if (removeLine) {
      updated = true;
      continue;
    }

    kept.push(line);
  }

  if (updated) {
    writeFileSync(FILE_PATH, `${kept.join('\n')}\n`, 'utf8');
  }

  return { updated, reason: updated ? '' : 'no-done-lines-removed' };
}

function loadState() {
  if (!existsSync(LOOP_STATE)) {
    return { completed: [], emptyScanStreak: 0, cycleStopRecommended: false, activeObjectiveId: '' };
  }

  const parsed = JSON.parse(readFileSync(LOOP_STATE, 'utf8'));
  return {
    completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    emptyScanStreak: Number.isInteger(parsed.emptyScanStreak) ? parsed.emptyScanStreak : 0,
    cycleStopRecommended: Boolean(parsed.cycleStopRecommended),
    activeObjectiveId: typeof parsed.activeObjectiveId === 'string' ? parsed.activeObjectiveId : '',
  };
}

function saveState(state) {
  writeFileSync(LOOP_STATE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function updateCycleGuardState(state, { hasOpenObjectives, command }) {
  if (hasOpenObjectives) {
    state.emptyScanStreak = 0;
    state.cycleStopRecommended = false;
    return {
      emptyScanStreak: state.emptyScanStreak,
      cycleStopRecommended: state.cycleStopRecommended,
    };
  }

  if (command === 'scan') {
    state.emptyScanStreak = Math.max(0, Number(state.emptyScanStreak || 0)) + 1;
  } else {
    state.emptyScanStreak = 0;
  }

  state.cycleStopRecommended = state.emptyScanStreak >= EMPTY_SCAN_STOP_THRESHOLD;

  return {
    emptyScanStreak: state.emptyScanStreak,
    cycleStopRecommended: state.cycleStopRecommended,
  };
}

function toSlotKey(index) {
  return `slot-${String(index).padStart(3, '0')}`;
}

function sanitizeRefPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

function loadCompletedEntries() {
  const state = loadState();
  return Array.isArray(state.completed) ? state.completed : [];
}

function buildTaskStatusTableRows(objectives, measuredAt) {
  const activeRows = objectives
    .filter((item) => item.status === 'PARTIAL' || item.status === 'TODO' || item.status === 'BLOCKED')
    .map((item, index) => ({
      taskRef:
        item.taskId && item.taskId.trim().length > 0
          ? `active-${sanitizeRefPart(item.taskId)}`
          : `active-${sanitizeRefPart(item.priority)}-${index + 1}-${sanitizeRefPart(item.text)}`,
      priority: item.priority,
      status: item.status,
      objective: item.text,
      isActive: item.status !== 'BLOCKED',
      rowType: item.status === 'BLOCKED' ? 'blocked' : 'active',
      completedAt: '',
      updatedAt: measuredAt,
    }));

  const completedRows = loadCompletedEntries()
    .slice()
    .sort((a, b) => {
      const aTime = Date.parse(a?.completedAt || '') || 0;
      const bTime = Date.parse(b?.completedAt || '') || 0;
      return bTime - aTime;
    })
    .map((item, index) => ({
      taskRef: `completed-${index + 1}-${sanitizeRefPart(item?.text || '')}`,
      priority: 'P0',
      status: 'COMPLETED',
      objective: String(item?.text || '').trim(),
      isActive: false,
      rowType: 'completed',
      completedAt: item?.completedAt || measuredAt,
      updatedAt: measuredAt,
    }));

  const selected = [...activeRows, ...completedRows].slice(0, TASK_STATUS_TABLE_MAX_ROWS);
  const padded = [];

  for (let index = 0; index < TASK_STATUS_TABLE_MAX_ROWS; index++) {
    const source = selected[index];

    if (source) {
      padded.push({
        taskKey: toSlotKey(index + 1),
        slotIndex: index + 1,
        ...source,
      });
      continue;
    }

    padded.push({
      taskKey: toSlotKey(index + 1),
      slotIndex: index + 1,
      taskRef: '',
      priority: '',
      status: 'EMPTY',
      objective: '',
      isActive: false,
      rowType: 'placeholder',
      completedAt: '',
      updatedAt: measuredAt,
    });
  }

  return padded;
}

function buildCheckupTable(eventType, nextObjectiveItem, measuredAt) {
  const checkupId = `checkup-${Date.now()}`;
  const linkedTaskRef = nextObjectiveItem
    ? nextObjectiveItem.taskId && nextObjectiveItem.taskId.trim().length > 0
      ? `active-${sanitizeRefPart(nextObjectiveItem.taskId)}`
      : `active-${sanitizeRefPart(nextObjectiveItem.priority)}-${sanitizeRefPart(nextObjectiveItem.text)}`
    : 'queue-empty';

  return [
    {
      checkupId,
      linkedTaskRef,
      eventType,
      status: 'STARTED',
      updatedAt: measuredAt,
    },
  ];
}

function buildFailureTable(checkupTable, orchestrationStats, measuredAt) {
  const checkupId = checkupTable[0]?.checkupId || `checkup-${Date.now()}`;

  if (orchestrationStats?.available === false) {
    return [
      {
        failureId: `failure-${checkupId}`,
        checkupId,
        linkedTaskRef: checkupTable[0]?.linkedTaskRef || 'unknown',
        source: 'orchestration-stats',
        failureReason: orchestrationStats.reason || 'stats unavailable',
        detail: orchestrationStats.detail || '',
        updatedAt: measuredAt,
      },
    ];
  }

  if ((orchestrationStats?.failedProductionExecutions || 0) > 0) {
    return [
      {
        failureId: `failure-${checkupId}`,
        checkupId,
        linkedTaskRef: checkupTable[0]?.linkedTaskRef || 'unknown',
        source: 'execution-failures',
        failureReason: `failedProductionExecutions=${orchestrationStats.failedProductionExecutions}`,
        detail: '',
        updatedAt: measuredAt,
      },
    ];
  }

  return [];
}

function logLine(message) {
  mkdirSync(resolve('bolt.work/n8n/copilot-inbox'), { recursive: true });
  appendFileSync(LOOP_LOG, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
}

function persistOrchestrationStats(stats) {
  mkdirSync(resolve('bolt.work', 'n8n'), { recursive: true });
  writeFileSync(ORCHESTRATION_STATS_FILE, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');

  return {
    ...stats,
    statsFile: ORCHESTRATION_STATS_FILE,
  };
}

function persistOpenTasksTable(rows, stats) {
  mkdirSync(resolve('bolt.work', 'n8n'), { recursive: true });

  const payload = {
    tableName: 'Project-bolt2-open-tasks',
    generatedAt: new Date().toISOString(),
    rows,
    stats,
  };

  writeFileSync(OPEN_TASKS_FALLBACK_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return {
    openTasksFile: OPEN_TASKS_FALLBACK_FILE,
  };
}

function validateOpenTaskRows(rows) {
  if (!Array.isArray(rows)) {
    throw new Error('openTasksTable must be an array.');
  }

  for (const row of rows) {
    if (!row || typeof row !== 'object') {
      throw new Error('openTasksTable entries must be objects.');
    }

    if (!row.taskKey || !row.priority || !row.status || !row.objective) {
      throw new Error('openTasksTable entries must include taskKey, priority, status, and objective.');
    }
  }
}

function assertTaskStatusSemantics(taskStatusTable, openTasksTable) {
  if (!Array.isArray(taskStatusTable) || taskStatusTable.length === 0) {
    throw new Error('taskStatusTable must be a non-empty array.');
  }

  const activeRows = taskStatusTable.filter((row) => row?.rowType === 'active');
  const blockedRows = taskStatusTable.filter((row) => row?.rowType === 'blocked');
  const completedRows = taskStatusTable.filter((row) => row?.rowType === 'completed');
  const placeholderRows = taskStatusTable.filter((row) => row?.rowType === 'placeholder');

  for (const row of activeRows) {
    if (row.isActive !== true) {
      throw new Error(`Active row ${row.taskKey || row.taskRef || 'unknown'} must have isActive=true.`);
    }

    if (row.status !== 'PARTIAL' && row.status !== 'TODO') {
      throw new Error(`Active row ${row.taskKey || row.taskRef || 'unknown'} has invalid status=${row.status}.`);
    }
  }

  for (const row of blockedRows) {
    if (row.isActive !== false) {
      throw new Error(`Blocked row ${row.taskKey || row.taskRef || 'unknown'} must have isActive=false.`);
    }

    if (row.status !== 'BLOCKED') {
      throw new Error(`Blocked row ${row.taskKey || row.taskRef || 'unknown'} has invalid status=${row.status}.`);
    }
  }

  for (const row of completedRows) {
    if (row.isActive !== false) {
      throw new Error(`Completed row ${row.taskKey || row.taskRef || 'unknown'} must have isActive=false.`);
    }

    if (row.status !== 'COMPLETED') {
      throw new Error(`Completed row ${row.taskKey || row.taskRef || 'unknown'} has invalid status=${row.status}.`);
    }
  }

  const firstCompletedIndex = taskStatusTable.findIndex((row) => row?.rowType === 'completed');
  const firstPlaceholderIndex = taskStatusTable.findIndex((row) => row?.rowType === 'placeholder');
  const placeholderStart = firstPlaceholderIndex === -1 ? taskStatusTable.length : firstPlaceholderIndex;

  if (firstCompletedIndex !== -1) {
    for (let index = firstCompletedIndex; index < placeholderStart; index++) {
      if (taskStatusTable[index]?.rowType !== 'completed') {
        throw new Error('Completed rows must be contiguous and appear before placeholders.');
      }
    }
  }

  if (firstPlaceholderIndex !== -1) {
    for (let index = firstPlaceholderIndex; index < taskStatusTable.length; index++) {
      if (taskStatusTable[index]?.rowType !== 'placeholder') {
        throw new Error('Placeholder rows must stay at the end of taskStatusTable.');
      }
    }
  }

  for (let index = 1; index < completedRows.length; index++) {
    const previous = Date.parse(completedRows[index - 1]?.completedAt || '');
    const current = Date.parse(completedRows[index]?.completedAt || '');

    if (Number.isFinite(previous) && Number.isFinite(current) && previous < current) {
      throw new Error('Completed rows must be ordered by completedAt descending (sliding window behavior).');
    }
  }

  const expectedActiveRows = openTasksTable.filter((row) => row.status === 'PARTIAL' || row.status === 'TODO').length;
  const expectedBlockedRows = openTasksTable.filter((row) => row.status === 'BLOCKED').length;

  if (activeRows.length !== expectedActiveRows) {
    throw new Error(`Active row count mismatch: expected=${expectedActiveRows}, actual=${activeRows.length}.`);
  }

  if (blockedRows.length !== expectedBlockedRows) {
    throw new Error(`Blocked row count mismatch: expected=${expectedBlockedRows}, actual=${blockedRows.length}.`);
  }

  return {
    ok: true,
    activeRows: activeRows.length,
    blockedRows: blockedRows.length,
    completedRows: completedRows.length,
    placeholderRows: placeholderRows.length,
  };
}

function buildOpenTasksTableRows(objectives, measuredAt) {
  const agentContext = resolveAgentIdentity();

  return objectives
    .filter((item) => item.status === 'PARTIAL' || item.status === 'TODO' || item.status === 'BLOCKED')
    .map((item, index) => ({
      taskKey: item.taskId && item.taskId.trim().length > 0 ? item.taskId.trim() : `${item.priority}-${index + 1}`,
      priority: item.priority,
      status: item.status,
      objective: item.text,
      agent: agentContext.agentId,
      updatedAt: measuredAt,
    }));
}

function getEnvValue(key) {
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
    getEnvValue('BOLT_AGENT_ID') ||
    getEnvValue('N8N_AGENT_ID') ||
    getEnvValue('AGENT_ID') ||
    getEnvValue('COMPUTERNAME') ||
    getEnvValue('HOSTNAME') ||
    hostname();
  const hostName = getEnvValue('COMPUTERNAME') || getEnvValue('HOSTNAME') || hostname();
  const userName = getEnvValue('USERNAME') || getEnvValue('USER') || 'unknown-user';
  const agentId = sanitizeAgentPart(explicitAgentId) || sanitizeAgentPart(hostName) || 'unknown-agent';

  return {
    agentId,
    hostName,
    userName,
  };
}

function validateStatsPayload(stats) {
  if (!stats || typeof stats !== 'object') {
    throw new Error('orchestrationStats must be an object.');
  }

  if (stats.available === true && !stats.measuredAt) {
    throw new Error('orchestrationStats.available=true requires measuredAt.');
  }

  if (stats.available === false && !stats.reason) {
    throw new Error('orchestrationStats.available=false requires reason.');
  }
}

function bridgeEmit() {
  const result = spawnSync(process.execPath, ['scripts/ongoing-work-bridge.mjs', 'emit'], {
    cwd: resolve('.'),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'bridge emit failed');
  }

  return JSON.parse(result.stdout);
}

function normalizeOngoingWork() {
  const result = spawnSync(process.execPath, ['scripts/ongoing-work-normalize.mjs'], {
    cwd: resolve('.'),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'ongoing-work normalize failed');
  }
}

function emitKeepalivePulse({ source, hasOpenObjectives }) {
  const result = spawnSync(
    process.execPath,
    [
      'scripts/n8n-keepalive-cadence.mjs',
      '--count',
      '1',
      '--interval-seconds',
      '0',
      '--silent',
      '--source',
      source,
      '--status',
      hasOpenObjectives ? 'in_progress' : 'idle',
      '--active-task',
      hasOpenObjectives ? 'true' : 'false',
    ],
    {
      cwd: resolve('.'),
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    const details = String(result.stderr || result.stdout || 'keepalive pulse failed').trim();
    logLine(`keepalive pulse failed source=${source} details=${details}`);
    return {
      attempted: true,
      ok: false,
      sent: 0,
      error: details,
    };
  }

  try {
    const parsed = JSON.parse(String(result.stdout || '').trim());
    return {
      attempted: true,
      ok: Boolean(parsed?.ok),
      sent: Number(parsed?.sent || 0),
      callbackUrl: String(parsed?.callbackUrl || '').trim(),
      returnAddress: parsed?.returnAddress || null,
    };
  } catch {
    return {
      attempted: true,
      ok: false,
      sent: 0,
      error: 'invalid keepalive pulse json output',
    };
  }
}

function loadManagedWorkflowIds() {
  if (!existsSync(ORCHESTRATOR_STATE)) {
    return [];
  }

  try {
    const parsed = JSON.parse(readFileSync(ORCHESTRATOR_STATE, 'utf8'));
    const workflows = parsed && typeof parsed === 'object' ? parsed.workflows : null;

    if (!workflows || typeof workflows !== 'object') {
      return [];
    }

    return Object.values(workflows)
      .map((item) => String(item?.id || '').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasDefinedOrchestrationLayer() {
  if (!existsSync(ORCHESTRATOR_STATE)) {
    return false;
  }

  try {
    const parsed = JSON.parse(readFileSync(ORCHESTRATOR_STATE, 'utf8'));
    const workflows = parsed && typeof parsed === 'object' ? parsed.workflows : null;

    if (!workflows || typeof workflows !== 'object') {
      return false;
    }

    const entries = Object.values(workflows).filter((item) => item && typeof item === 'object');

    if (entries.length === 0) {
      return false;
    }

    return entries.some((item) => String(item?.id || '').trim().length > 0 && item?.active !== false);
  } catch {
    return false;
  }
}

function enforceOrchestrationDelivery(notifyResult, policy) {
  const orchestrationDefined = hasDefinedOrchestrationLayer();

  if (!orchestrationDefined) {
    return;
  }

  if (policy.exceptionEnabled) {
    logLine(
      `orchestration exception active; bypassing strict delivery check. reason=${policy.exceptionReason || 'not provided'}`,
    );
    return;
  }

  if (policy.mode === 'AUTO') {
    if (!notifyResult?.sent) {
      const reason = notifyResult?.reason || 'unknown-notify-error';
      logLine(`orchestration notify failed in AUTO mode; continuing without hard stop. reason=${reason}`);
    }
    return;
  }

  if (!notifyResult?.sent) {
    const reason = notifyResult?.reason || 'unknown-notify-error';
    throw new Error(
      `Orchestration layer is defined and required, but notify failed (${reason}). ` +
        `Fix orchestration delivery or set explicit exception in .ongoing-work.md under '## Orchestration Enforcement' before continuing.`,
    );
  }
}

function durationMs(execution) {
  const started = execution?.startedAt ? Date.parse(execution.startedAt) : NaN;
  const stopped = execution?.stoppedAt ? Date.parse(execution.stoppedAt) : NaN;

  if (!Number.isFinite(started) || !Number.isFinite(stopped) || stopped < started) {
    return 0;
  }

  return stopped - started;
}

async function collectOrchestrationStats() {
  const { baseUrl, apiKey } = getN8nConfig();

  if (!baseUrl || !apiKey) {
    return {
      available: false,
      reason: 'missing endpoint or api key',
    };
  }

  const managedWorkflowIds = new Set(loadManagedWorkflowIds());

  if (managedWorkflowIds.size === 0) {
    return {
      available: false,
      reason: 'no managed workflows deployed yet',
    };
  }

  try {
    const response = await fetch(`${baseUrl}/api/v1/executions?limit=250`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        available: false,
        reason: `executions api failed: ${response.status}`,
        detail: text.slice(0, 240),
      };
    }

    const payload = await response.json();
    const executions = Array.isArray(payload?.data) ? payload.data : [];

    const managedExecutions = executions.filter((execution) => managedWorkflowIds.has(String(execution?.workflowId || '')));
    const productionExecutions = managedExecutions.filter((execution) => String(execution?.mode || '').toLowerCase() === 'webhook');
    const failedProductionExecutions = productionExecutions.filter(
      (execution) => String(execution?.status || '').toLowerCase() !== 'success',
    );

    const runtimeMs = productionExecutions.map(durationMs).filter((value) => value > 0);
    const totalRuntimeMs = runtimeMs.reduce((sum, value) => sum + value, 0);
    const averageRuntimeMs = runtimeMs.length > 0 ? Math.round(totalRuntimeMs / runtimeMs.length) : 0;
    const failureRatePercent =
      productionExecutions.length > 0
        ? Number(((failedProductionExecutions.length / productionExecutions.length) * 100).toFixed(2))
        : 0;

    // --- Custom: 30 min saved per successful full round ---
    // Count successful full rounds (all open objectives completed in a cycle)
    // For now, treat each successful production execution as a round (if more logic needed, adjust here)
    const minutesSavedPerRound = 30;
    const successfulRounds = productionExecutions.length - failedProductionExecutions.length;
    const estimatedTimeSavedMinutes = Math.max(0, successfulRounds * minutesSavedPerRound);

    return {
      available: true,
      sampledExecutions: executions.length,
      managedExecutions: managedExecutions.length,
      productionExecutions: productionExecutions.length,
      failedProductionExecutions: failedProductionExecutions.length,
      failureRatePercent,
      averageRuntimeMs,
      estimatedTimeSavedMinutes,
      minutesSavedPerRound,
      successfulRounds,
      manualMinutesPerRun: 6,
      measuredAt: new Date().toISOString(),
      note: 'Each successful full rotation of project-bolt2-ongoing-work-dispatch saves 30 min as orchestrated.'
    };
  } catch (error) {
    return {
      available: false,
      reason: 'stats collection error',
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function getN8nConfig() {
  const endpoint =
    process.env.N8N_BASE_URL ||
    process.env.N8N_ENDPOINT ||
    process.env.n8n_base_url ||
    process.env.n8n_endpoint ||
    process.env.n8n_Arvekari_endpoint ||
    '';
  const explicitWebhookBase =
    process.env.N8N_WEBHOOK_BASE_URL ||
    process.env.N8N_WEBHOOK_URL ||
    process.env.n8n_webhook_base_url ||
    process.env.n8n_webhook_url ||
    process.env.n8n_Arvekari_webhookEndpoint ||
    '';
  const apiKey =
    process.env.N8N_API_KEY ||
    process.env.N8N_APIKEY ||
    process.env.n8n_api_key ||
    process.env.n8n_apikey ||
    process.env.n8n_Arvekari_ApiKey ||
    '';

  const normalizedEndpoint = endpoint.trim().replace(/\/$/, '');
  const normalizedWebhook = explicitWebhookBase.trim().replace(/\/$/, '');
  const webhookCandidates = new Set();

  if (normalizedWebhook) {
    webhookCandidates.add(normalizedWebhook);
  }

  if (normalizedEndpoint) {
    webhookCandidates.add(normalizedEndpoint);
    webhookCandidates.add(normalizedEndpoint.replace(/\/api(?:\/v\d+)?$/i, ''));
  }

  const webhookBaseUrls = Array.from(webhookCandidates).filter(Boolean);

  return {
    baseUrl: normalizedEndpoint,
    webhookBaseUrls,
    apiKey: apiKey.trim(),
  };
}

function resolveListenerConfigPath() {
  return resolveListenerConfigPathForAgent().path;
}

function normalizeReturnAddress(returnAddress = {}) {
  const protocol = String(returnAddress.protocol || 'http').trim() || 'http';
  const pathRaw = String(returnAddress.path || '/publish-status').trim() || '/publish-status';
  const path = pathRaw.startsWith('/') ? pathRaw : `/${pathRaw}`;
  const port = Number(returnAddress.port || 8788);
  const fqdn = String(returnAddress.fqdn || '').trim();
  const ip = String(returnAddress.ip || '').trim();
  const preferred = String(returnAddress.hostSelection || returnAddress.mode || 'fqdn').trim().toLowerCase();
  const hostSelection = preferred === 'ip' ? 'ip' : 'fqdn';
  const selectedHost = hostSelection === 'ip' ? ip || fqdn : fqdn || ip;
  const callbackUrl = selectedHost ? `${protocol}://${selectedHost}${port ? `:${port}` : ''}${path}` : '';

  return {
    protocol,
    port,
    path,
    hostSelection,
    mode: hostSelection,
    fqdn,
    ip,
    host: selectedHost,
    callbackUrl,
  };
}

function resolveRuntimeReturnAddress() {
  const fallback = normalizeReturnAddress({
    protocol: 'http',
    hostSelection: 'fqdn',
    fqdn: 'localhost',
    ip: '',
    port: 8788,
    path: '/publish-status',
  });

  const configPath = resolveListenerConfigPath();

  if (!configPath) {
    return fallback;
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8'));
    return normalizeReturnAddress(raw?.returnAddress || {});
  } catch {
    return fallback;
  }
}

function readListenerHealthPath() {
  const configPath = resolveListenerConfigPath();

  if (!configPath) {
    return '/health';
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8'));
    const configured = String(raw?.endpoints?.health || '/health').trim() || '/health';
    return configured.startsWith('/') ? configured : `/${configured}`;
  } catch {
    return '/health';
  }
}

function buildListenerHealthUrl() {
  const returnAddress = resolveRuntimeReturnAddress();
  const callbackUrl = String(returnAddress.callbackUrl || '').trim();

  if (!callbackUrl) {
    return { returnAddress, callbackUrl, healthUrl: '', reason: 'missing-callback-url' };
  }

  try {
    const callback = new URL(callbackUrl);
    const healthPath = readListenerHealthPath();
    const healthUrl = `${callback.origin}${healthPath}`;
    return { returnAddress, callbackUrl, healthUrl, reason: '' };
  } catch {
    return { returnAddress, callbackUrl, healthUrl: '', reason: 'invalid-callback-url' };
  }
}

async function isListenerReachable(healthUrl) {
  if (!healthUrl) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function ensureListenerRunning() {
  const runtime = buildListenerHealthUrl();

  if (!runtime.healthUrl) {
    return {
      ensured: false,
      started: false,
      ready: false,
      reason: runtime.reason,
      callbackUrl: runtime.callbackUrl,
    };
  }

  const alreadyRunning = await isListenerReachable(runtime.healthUrl);

  if (alreadyRunning) {
    return {
      ensured: true,
      started: false,
      ready: true,
      reason: 'already-running',
      callbackUrl: runtime.callbackUrl,
      healthUrl: runtime.healthUrl,
    };
  }

  try {
    const child = spawn(process.execPath, ['scripts/n8n-local-listener.mjs'], {
      cwd: resolve('.'),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
  } catch (error) {
    return {
      ensured: false,
      started: false,
      ready: false,
      reason: error instanceof Error ? error.message : String(error),
      callbackUrl: runtime.callbackUrl,
      healthUrl: runtime.healthUrl,
    };
  }

  for (let attempt = 1; attempt <= 8; attempt++) {
    await sleep(1000);

    if (await isListenerReachable(runtime.healthUrl)) {
      return {
        ensured: true,
        started: true,
        ready: true,
        reason: '',
        attempts: attempt,
        callbackUrl: runtime.callbackUrl,
        healthUrl: runtime.healthUrl,
      };
    }
  }

  return {
    ensured: false,
    started: true,
    ready: false,
    reason: 'listener-not-ready-after-start',
    callbackUrl: runtime.callbackUrl,
    healthUrl: runtime.healthUrl,
  };
}

async function n8nApiRequest(baseUrl, apiKey, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': apiKey,
      ...(options.headers || {}),
    },
    body: options.body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`n8n api ${options.method || 'GET'} ${path} failed (${response.status}): ${text.slice(0, 220)}`);
  }

  const text = await response.text();

  if (!text || text.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function resolveOrchestrationTableCandidates() {
  const envCandidates = [
    process.env.N8N_ORCHESTRATION_TASKS_TABLE_ID,
    process.env.N8N_ORCHESTRATION_TASKS_TABLE,
    process.env.N8N_OPEN_TASKS_TABLE_ID,
    process.env.N8N_OPEN_TASKS_TABLE,
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return [...new Set([...envCandidates, ...ORCHESTRATION_TABLE_CANDIDATE_NAMES])];
}

async function resolveOrchestrationTable(baseUrl, apiKey) {
  const candidates = new Set(resolveOrchestrationTableCandidates());
  const payload = await n8nApiRequest(baseUrl, apiKey, '/api/v1/data-tables?limit=200');
  const tables = Array.isArray(payload?.data) ? payload.data : [];
  const match = tables.find((table) => {
    const id = String(table?.id || '').trim();
    const name = String(table?.name || '').trim();
    return candidates.has(id) || candidates.has(name);
  });

  if (!match?.id) {
    return null;
  }

  return {
    id: String(match.id),
    name: String(match?.name || '').trim(),
  };
}

function normalizeOrchestrationStatus(status) {
  const raw = String(status || '').trim().toUpperCase();
  if (raw === 'DONE' || raw === 'COMPLETED') {
    return 'DONE';
  }
  if (raw === 'PARTIAL' || raw === 'IN_PROGRESS' || raw === 'IN-PROGRESS') {
    return 'PARTIAL';
  }
  if (raw === 'BLOCKED') {
    return 'BLOCKED';
  }
  return 'TODO';
}

async function upsertTaskStatusToOrchestrationTable(objective, status) {
  const taskId = String(objective?.taskId || '').trim();

  if (!taskId) {
    return {
      synced: false,
      skipped: true,
      reason: 'missing taskId',
    };
  }

  const { baseUrl, apiKey } = getN8nConfig();

  if (!baseUrl || !apiKey) {
    return {
      synced: false,
      skipped: true,
      reason: 'missing endpoint or api key',
    };
  }

  try {
    const table = await resolveOrchestrationTable(baseUrl, apiKey);

    if (!table?.id) {
      return {
        synced: false,
        skipped: true,
        reason: 'orchestration table not found',
      };
    }

    const now = new Date().toISOString();
    const normalizedStatus = normalizeOrchestrationStatus(status);
    const mergedText = String(objective?.text || '').trim();

    const agentContext = resolveAgentIdentity();

    const upsertBody = {
      filter: {
        filters: [
          {
            columnName: 'taskId',
            condition: 'eq',
            value: taskId,
          },
        ],
      },
      data: {
        taskId,
        status: normalizedStatus,
        priority: String(objective?.priority || ''),
        title: mergedText,
        description: mergedText,
        agent: agentContext.agentId,
        updatedTime: now,
      },
    };

    await n8nApiRequest(baseUrl, apiKey, `/api/v1/data-tables/${encodeURIComponent(table.id)}/rows/upsert`, {
      method: 'POST',
      body: JSON.stringify(upsertBody),
    });

    return {
      synced: true,
      tableId: table.id,
      tableName: table.name,
      taskId,
      status: normalizedStatus,
      reason: '',
    };
  } catch (error) {
    return {
      synced: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function notifyN8n(eventType, payload) {
  const { baseUrl, webhookBaseUrls, apiKey } = getN8nConfig();

  if (!baseUrl && webhookBaseUrls.length === 0) {
    return { sent: false, reason: 'missing endpoint' };
  }

  // Detect model from environment or payload
  const model = process.env.OPENAI_MODEL || process.env.MODEL || (payload && payload.model) || '';
  const isGpt41 = typeof model === 'string' && model.toLowerCase().includes('gpt-4.1');

  // If model is GPT-4.1, always require the receiving party to act (managed/physical changes)
  if (isGpt41) {
    payload.orchestratorInstruction = 'Model is GPT-4.1: Receiving party MUST perform the required managed work or physical changes, even if not triggered manually.';
    payload.responseFormat = {
      required: true,
      fields: ['status', 'workflow', 'action', 'queueState', 'commands'],
    };
  }

  const agentContext = resolveAgentIdentity();
  const listenerBoot = await ensureListenerRunning();
  const returnAddress = resolveRuntimeReturnAddress();
  const callbackUrl = returnAddress.callbackUrl || '';
  payload.agentContext = payload.agentContext || agentContext;
  payload.returnAddress = payload.returnAddress || returnAddress;
  payload.callbackUrl = payload.callbackUrl || callbackUrl;
  payload.listenerBoot = payload.listenerBoot || listenerBoot;

  const body = {
    eventType,
    emittedAt: new Date().toISOString(),
    callbackUrl,
    returnAddress,
    listenerBoot,
    payload,
  };

  const pathTargets = [
    '/webhook/ongoing-work-dispatch',
    '/webhook/ci-publish-watch-sync',
    '/webhook-prod/ongoing-work-dispatch',
    '/webhook-prod/ci-publish-watch-sync',
  ];

  const attempts = [];

  for (const baseUrlCandidate of webhookBaseUrls) {
    for (const target of pathTargets) {
      const targetUrl = `${baseUrlCandidate}${target}`;
      attempts.push(targetUrl);

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        const text = await response.text();
        const parsed = (() => {
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        })();

        if (response.ok) {
          return { sent: true, target, targetUrl, status: response.status, body: parsed };
        }

        const bodySnippet = typeof parsed === 'string' ? parsed.slice(0, 180) : JSON.stringify(parsed).slice(0, 180);
        logLine(`n8n notify ${targetUrl} failed status=${response.status} body=${bodySnippet}`);
      } catch (error) {
        logLine(`n8n notify ${targetUrl} error=${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return {
    sent: false,
    reason: 'all webhook targets failed',
    attemptedTargets: attempts,
  };
}

function normalizeDispatchResponse(responseBody) {
  if (!responseBody || typeof responseBody !== 'object' || Array.isArray(responseBody)) {
    return null;
  }

  const candidate =
    responseBody.response && typeof responseBody.response === 'object' && !Array.isArray(responseBody.response)
      ? responseBody.response
      : responseBody;

  return candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : null;
}

function translateLegacyDispatchResponse(raw, hasOpenObjectives) {
  const queueIsEmptyByLegacySignals =
    String(raw?.jobPulse || '').trim() === 'start-new-ongoing-check-job' ||
    (typeof raw?.restartCommand === 'string' && raw.restartCommand.trim().length > 0);

  const queueState = hasOpenObjectives && !queueIsEmptyByLegacySignals ? 'open' : 'empty';
  const action = queueState === 'empty' ? 'restart-cycle' : 'continue-objective';
  const commands =
    action === 'restart-cycle'
      ? [{ type: 'cycle.restart', command: (raw?.restartCommand || 'pnpm run ongoing:cycle -- scan').trim() }]
      : [{ type: 'objective.executeNext' }];

  return {
    status: typeof raw?.status === 'string' && raw.status.trim().length > 0 ? raw.status.trim() : 'accepted',
    workflow: typeof raw?.workflow === 'string' && raw.workflow.trim().length > 0 ? raw.workflow.trim() : 'ongoing-work-dispatch',
    action,
    queueState,
    commands,
    translatedFromLegacy: true,
  };
}

function resolveStructuredDispatchResponse(responseBody, hasOpenObjectives) {
  const raw = normalizeDispatchResponse(responseBody);

  if (!raw) {
    return {
      status: 'accepted',
      workflow: 'ongoing-work-dispatch',
      action: hasOpenObjectives ? 'continue-objective' : 'restart-cycle',
      queueState: hasOpenObjectives ? 'open' : 'empty',
      commands: hasOpenObjectives
        ? [{ type: 'objective.executeNext' }]
        : [{ type: 'cycle.restart', command: 'pnpm run ongoing:cycle -- scan' }],
      translatedFromLegacy: false,
    };
  }

  const hasStructuredFields =
    typeof raw?.action === 'string' &&
    typeof raw?.queueState === 'string' &&
    Array.isArray(raw?.commands) &&
    raw.commands.length > 0;

  if (hasStructuredFields) {
    return {
      status: typeof raw?.status === 'string' && raw.status.trim().length > 0 ? raw.status.trim() : 'accepted',
      workflow: typeof raw?.workflow === 'string' && raw.workflow.trim().length > 0 ? raw.workflow.trim() : 'ongoing-work-dispatch',
      action: raw.action,
      queueState: raw.queueState,
      commands: raw.commands,
      translatedFromLegacy: false,
    };
  }

  return translateLegacyDispatchResponse(raw, hasOpenObjectives);
}

function buildNextRequest(
  nextObjectiveItem,
  notified,
  cycleGuard = { emptyScanStreak: 0, cycleStopRecommended: false },
  options = { continuingActive: false, policy: { mode: 'AUTO', confirmationRequired: false } },
) {
  const hasOpenObjectives = Boolean(nextObjectiveItem);
  const structured = resolveStructuredDispatchResponse(notified?.body, hasOpenObjectives);
  const continuingActive = Boolean(options?.continuingActive);
  const autonomousMode = String(options?.policy?.mode || '').toUpperCase() === 'AUTO';

  const model = process.env.OPENAI_MODEL || process.env.MODEL || '';
  const isGpt41 = typeof model === 'string' && model.toLowerCase().includes('gpt-4.1');

  if (nextObjectiveItem) {
    if (continuingActive) {
      const objectiveLabel = `[${nextObjectiveItem.priority}] ${nextObjectiveItem.status} ${nextObjectiveItem.text}`;

      if (autonomousMode) {
        return {
          message: `TASK_CONTINUE ${objectiveLabel}`,
          finalRemark: 'AUTONOMOUS_CONTINUE_NO_CONFIRMATION',
          orchestrationPulse: {
            jobPulse: 'continue-current-ongoing-job',
            restartCommand: '',
            reason: 'Active objective is unfinished; continue same task until completion.',
          },
          response: {
            ...structured,
            action: 'continue-current-objective',
            queueState: 'open',
            commands: [
              { type: 'objective.continueActive' },
              { type: 'objective.getPrompt', command: 'pnpm run ongoing:bridge -- prompt' },
            ],
            autonomous: true,
            confirmationRequired: false,
            gpt41RequiresAction: isGpt41,
          },
          cycleGuard,
        };
      }

      return {
        message: `Current objective is still active and not finished: ${objectiveLabel}`,
        finalRemark:
          'Do not request a new job yet. Run `pnpm run ongoing:bridge -- prompt` to get the continuation prompt for unfinished current objectives.',
        orchestrationPulse: {
          jobPulse: 'continue-current-ongoing-job',
          restartCommand: '',
          reason: 'Active objective is unfinished; continue same task until completion.',
        },
        response: {
          ...structured,
          action: 'continue-current-objective',
          queueState: 'open',
          commands: [
            { type: 'objective.continueActive' },
            { type: 'objective.getPrompt', command: 'pnpm run ongoing:bridge -- prompt' },
          ],
          autonomous: false,
          confirmationRequired: true,
          gpt41RequiresAction: isGpt41,
        },
        cycleGuard,
      };
    }

    const objectiveLabel = `[${nextObjectiveItem.priority}] ${nextObjectiveItem.status} ${nextObjectiveItem.text}`;

    if (autonomousMode) {
      return {
        message: `TASK_EXECUTE ${objectiveLabel}`,
        finalRemark: 'AUTONOMOUS_EXECUTION_CONTINUES',
        orchestrationPulse: {
          jobPulse: structured.queueState === 'empty' ? 'start-new-ongoing-check-job' : 'continue-current-ongoing-job',
          restartCommand: structured.queueState === 'empty' ? 'pnpm run ongoing:cycle -- scan' : '',
          reason:
            structured.queueState === 'empty'
              ? 'Queue drained in this cycle; restart as a new job.'
              : 'Unfinished objectives remain in queue.',
        },
        response: {
          ...structured,
          autonomous: true,
          confirmationRequired: false,
          gpt41RequiresAction: isGpt41,
        },
        cycleGuard,
      };
    }

    return {
      message: `Execute objective: ${objectiveLabel}`,
      finalRemark:
        'Work only this objective until done. On completion, run `pnpm run ongoing:cycle -- done` to auto-close it and force the next queued objective.',
      orchestrationPulse: {
        jobPulse: structured.queueState === 'empty' ? 'start-new-ongoing-check-job' : 'continue-current-ongoing-job',
        restartCommand: structured.queueState === 'empty' ? 'pnpm run ongoing:cycle -- scan' : '',
        reason: structured.queueState === 'empty' ? 'Queue drained in this cycle; restart as a new job.' : 'Unfinished objectives remain in queue.',
      },
      response: {
        ...structured,
        autonomous: false,
        confirmationRequired: true,
        gpt41RequiresAction: isGpt41,
      },
      cycleGuard,
    };
  }

  if (cycleGuard.cycleStopRecommended) {
    return {
      message: 'No unfinished objectives detected for two consecutive scan cycles.',
      finalRemark: 'Stop this check job now. If new unfinished work appears later, run a new cycle start command.',
      orchestrationPulse: {
        jobPulse: 'stop-ongoing-check-job',
        restartCommand: '',
        reason: `Queue remained empty for ${cycleGuard.emptyScanStreak} consecutive scans; stopping until new work appears.`,
      },
      response: {
        ...structured,
        autonomous: autonomousMode,
        confirmationRequired: !autonomousMode,
        action: 'stop-cycle',
        queueState: 'empty',
        commands: [{ type: 'cycle.stop' }],
        gpt41RequiresAction: isGpt41,
      },
      cycleGuard,
    };
  }

  return {
    message: 'All listed unfinished objectives appear completed.',
    finalRemark: 'Please check .ongoing-work.md again for newly added unfinished work and restart the cycle if found.',
    orchestrationPulse: {
      jobPulse: 'start-new-ongoing-check-job',
      restartCommand: 'pnpm run ongoing:cycle -- scan',
      reason: 'Queue drained in this cycle; start a fresh check as a new orchestration job.',
    },
    response: {
      ...structured,
      autonomous: autonomousMode,
      confirmationRequired: !autonomousMode,
      gpt41RequiresAction: isGpt41,
    },
    cycleGuard,
  };
}

function printJson(data) {
  console.log(JSON.stringify(data, null, 2));
}

function parseDoneArguments(args) {
  const flags = new Set(['--confirm-complete', '--confirm', '--complete']);
  let confirmComplete = false;
  const textParts = [];

  for (const arg of args) {
    const value = String(arg || '').trim();

    if (!value) {
      continue;
    }

    if (flags.has(value.toLowerCase())) {
      confirmComplete = true;
      continue;
    }

    textParts.push(value);
  }

  return {
    confirmComplete,
    providedText: textParts.join(' ').trim(),
  };
}

async function commandNext() {
  normalizeOngoingWork();
  const state = loadState();
  const markdown = readMarkdown();
  const policy = readOrchestrationPolicy(markdown);
  const objectives = parseObjectives(markdown);
  const { next, continuingActive } = resolveNextObjectiveForExecution(state, objectives);
  const cycleGuard = updateCycleGuardState(state, { hasOpenObjectives: Boolean(next), command: 'next' });
  saveState(state);
  const emitted = bridgeEmit();
  const keepalivePulse = emitKeepalivePulse({ source: 'n8n-ongoing-cycle-next', hasOpenObjectives: Boolean(next) });
  const orchestrationStats = persistOrchestrationStats(await collectOrchestrationStats());
  const measuredAt = orchestrationStats.measuredAt || new Date().toISOString();
  const openTasksTable = buildOpenTasksTableRows(objectives, measuredAt);
  const taskStatusTable = buildTaskStatusTableRows(objectives, measuredAt);
  const checkupTable = buildCheckupTable('objective.next', next, measuredAt);
  const failureTable = buildFailureTable(checkupTable, orchestrationStats, measuredAt);
  const rowSemantics = assertTaskStatusSemantics(taskStatusTable, openTasksTable);
  validateStatsPayload(orchestrationStats);
  validateOpenTaskRows(openTasksTable);
  const openTasksPersisted = persistOpenTasksTable(openTasksTable, orchestrationStats);
  const notify = await notifyN8n('objective.next', {
    next,
    openCount: openTasksTable.length,
    emitted,
    openTasksTable,
    orchestrationStats,
    taskStatusTable,
    checkupTable,
    failureTable,
    rowSemantics,
    keepalivePulse,
  });
  enforceOrchestrationDelivery(notify, policy);
  const request = buildNextRequest(next, notify, cycleGuard, { continuingActive, policy });

  printJson({
    action: 'next',
    next,
    openCount: openTasksTable.length,
    emitted,
    keepalivePulse,
    notified: notify,
    request,
    continuingActive,
    orchestrationStats,
    openTasksTable,
    taskStatusTable,
    checkupTable,
    failureTable,
    rowSemantics,
    cycleGuard,
    orchestrationPolicy: policy,
    ...openTasksPersisted,
  });
}

async function commandDone(args) {
  normalizeOngoingWork();
  const state = loadState();
  const markdown = readMarkdown();
  const policy = readOrchestrationPolicy(markdown);
  const objectives = parseObjectives(markdown);
  const allObjectives = parseObjectivesAllStatuses(markdown);
  const doneArgs = parseDoneArguments(args);
  const providedText = doneArgs.providedText;
  const requestedTaskId = extractTaskIdFromDoneText(providedText);
  const { next: resolvedCurrentObjective } = resolveNextObjectiveForExecution(state, objectives);
  let currentObjective = resolvedCurrentObjective;

  if (requestedTaskId) {
    const requested = allObjectives.find((item) => String(item.taskId || '').trim().toLowerCase() === requestedTaskId.toLowerCase());

    if (!requested) {
      throw new Error(`Requested taskId '${requestedTaskId}' not found in .ongoing-work.md.`);
    }

    if (requested.status === 'DONE') {
      throw new Error(`Requested taskId '${requestedTaskId}' is already DONE. Use 'partial' only for in-progress tasks.`);
    }

    currentObjective = requested;
  }

  if (!currentObjective) {
    throw new Error('No active objective to complete. Run `pnpm run ongoing:cycle -- next` to resolve the next queued task.');
  }

  if (currentObjective.status === 'PARTIAL' && !doneArgs.confirmComplete) {
    const taskLabel = currentObjective.taskId ? `[taskId: ${currentObjective.taskId}]` : currentObjective.text;
    throw new Error(
      `Objective ${taskLabel} is PARTIAL. Keep it in partial mode until all remaining work is done. ` +
        `When fully complete, run done with explicit confirmation flag: ` +
        `pnpm run ongoing:cycle -- done --confirm-complete "${taskLabel} ..."`,
    );
  }

  const doneText = providedText || currentObjective.text;

  const markdownUpdate = markObjectiveDoneInMarkdown(currentObjective);
  const changelogUpdate = appendDoneObjectiveToChangelog(currentObjective, doneText);
  const cleanupUpdate = changelogUpdate.updated
    ? cleanupDoneObjectivesInMarkdown(currentObjective.taskId || '')
    : { updated: false, reason: 'skipped-cleanup-when-changelog-not-updated' };

  state.completed.push({
    text: doneText,
    completedAt: new Date().toISOString(),
  });
  state.activeObjectiveId = '';

  const refreshedMarkdown = readMarkdown();
  const refreshedObjectives = parseObjectives(refreshedMarkdown);
  const { next, continuingActive } = resolveNextObjectiveForExecution(state, refreshedObjectives);
  const cycleGuard = updateCycleGuardState(state, { hasOpenObjectives: Boolean(next), command: 'done' });
  saveState(state);
  const emitted = bridgeEmit();
  const keepalivePulse = emitKeepalivePulse({ source: 'n8n-ongoing-cycle-done', hasOpenObjectives: Boolean(next) });
  const orchestrationStats = persistOrchestrationStats(await collectOrchestrationStats());
  const measuredAt = orchestrationStats.measuredAt || new Date().toISOString();
  const openTasksTable = buildOpenTasksTableRows(refreshedObjectives, measuredAt);
  const taskStatusTable = buildTaskStatusTableRows(refreshedObjectives, measuredAt);
  const checkupTable = buildCheckupTable('objective.done', next, measuredAt);
  const failureTable = buildFailureTable(checkupTable, orchestrationStats, measuredAt);
  const rowSemantics = assertTaskStatusSemantics(taskStatusTable, openTasksTable);
  validateStatsPayload(orchestrationStats);
  validateOpenTaskRows(openTasksTable);
  const openTasksPersisted = persistOpenTasksTable(openTasksTable, orchestrationStats);
  const notify = await notifyN8n('objective.done', {
    done: doneText,
    doneObjective: currentObjective,
    markdownUpdate,
    changelogUpdate,
    cleanupUpdate,
    next,
    openCount: openTasksTable.length,
    emitted,
    openTasksTable,
    orchestrationStats,
    taskStatusTable,
    checkupTable,
    failureTable,
    rowSemantics,
    keepalivePulse,
  });
  const directStatusSync = await upsertTaskStatusToOrchestrationTable(currentObjective, 'DONE');
  enforceOrchestrationDelivery(notify, policy);
  const request = buildNextRequest(next, notify, cycleGuard, { continuingActive, policy });

  printJson({
    action: 'done',
    done: doneText,
    completionConfirmed: doneArgs.confirmComplete,
    completedObjective: currentObjective,
    markdownUpdate,
    changelogUpdate,
    cleanupUpdate,
    next,
    openCount: openTasksTable.length,
    completedCount: state.completed.length,
    emitted,
    keepalivePulse,
    notified: notify,
    directStatusSync,
    request,
    continuingActive,
    orchestrationStats,
    openTasksTable,
    taskStatusTable,
    checkupTable,
    failureTable,
    rowSemantics,
    cycleGuard,
    orchestrationPolicy: policy,
    ...openTasksPersisted,
  });
}

async function commandPartial(args) {
  normalizeOngoingWork();
  const state = loadState();
  const markdown = readMarkdown();
  const policy = readOrchestrationPolicy(markdown);
  const objectives = parseObjectives(markdown);
  const allObjectives = parseObjectivesAllStatuses(markdown);
  const providedText = args.join(' ').trim();
  const requestedTaskId = extractTaskIdFromDoneText(providedText);
  const { next: resolvedCurrentObjective } = resolveNextObjectiveForExecution(state, objectives);
  let currentObjective = resolvedCurrentObjective;

  if (requestedTaskId) {
    const requested = allObjectives.find((item) => String(item.taskId || '').trim().toLowerCase() === requestedTaskId.toLowerCase());

    if (!requested) {
      throw new Error(`Requested taskId '${requestedTaskId}' not found in .ongoing-work.md.`);
    }

    currentObjective = requested;
  }

  if (!currentObjective) {
    throw new Error('No active objective to mark partial. Run `pnpm run ongoing:cycle -- next` first.');
  }

  const partialText = providedText || currentObjective.text;
  const markdownUpdate = markObjectiveStatusInMarkdown(currentObjective, 'PARTIAL');

  state.activeObjectiveId = objectiveIdentity(currentObjective);

  const refreshedMarkdown = readMarkdown();
  const refreshedObjectives = parseObjectives(refreshedMarkdown);
  const { next, continuingActive } = resolveNextObjectiveForExecution(state, refreshedObjectives);
  const cycleGuard = updateCycleGuardState(state, { hasOpenObjectives: Boolean(next), command: 'next' });
  saveState(state);
  const emitted = bridgeEmit();
  const keepalivePulse = emitKeepalivePulse({ source: 'n8n-ongoing-cycle-partial', hasOpenObjectives: Boolean(next) });
  const orchestrationStats = persistOrchestrationStats(await collectOrchestrationStats());
  const measuredAt = orchestrationStats.measuredAt || new Date().toISOString();
  const openTasksTable = buildOpenTasksTableRows(refreshedObjectives, measuredAt);
  const taskStatusTable = buildTaskStatusTableRows(refreshedObjectives, measuredAt);
  const checkupTable = buildCheckupTable('objective.partial', next, measuredAt);
  const failureTable = buildFailureTable(checkupTable, orchestrationStats, measuredAt);
  const rowSemantics = assertTaskStatusSemantics(taskStatusTable, openTasksTable);
  validateStatsPayload(orchestrationStats);
  validateOpenTaskRows(openTasksTable);
  const openTasksPersisted = persistOpenTasksTable(openTasksTable, orchestrationStats);
  const notify = await notifyN8n('objective.partial', {
    partial: partialText,
    objective: currentObjective,
    markdownUpdate,
    next,
    openCount: openTasksTable.length,
    emitted,
    openTasksTable,
    orchestrationStats,
    taskStatusTable,
    checkupTable,
    failureTable,
    rowSemantics,
    keepalivePulse,
  });
  const directStatusSync = await upsertTaskStatusToOrchestrationTable(currentObjective, 'PARTIAL');
  enforceOrchestrationDelivery(notify, policy);
  const request = buildNextRequest(next, notify, cycleGuard, { continuingActive, policy });

  printJson({
    action: 'partial',
    partial: partialText,
    objective: currentObjective,
    markdownUpdate,
    next,
    openCount: openTasksTable.length,
    emitted,
    keepalivePulse,
    notified: notify,
    directStatusSync,
    request,
    continuingActive,
    orchestrationStats,
    openTasksTable,
    taskStatusTable,
    checkupTable,
    failureTable,
    rowSemantics,
    cycleGuard,
    orchestrationPolicy: policy,
    ...openTasksPersisted,
  });
}

async function commandLoop() {
  normalizeOngoingWork();
  const state = loadState();
  const markdown = readMarkdown();
  const policy = readOrchestrationPolicy(markdown);
  const objectives = parseObjectives(markdown);
  const { next, continuingActive } = resolveNextObjectiveForExecution(state, objectives);
  const cycleGuard = updateCycleGuardState(state, { hasOpenObjectives: Boolean(next), command: 'scan' });
  saveState(state);
  const emitted = bridgeEmit();
  const keepalivePulse = emitKeepalivePulse({ source: 'n8n-ongoing-cycle-scan', hasOpenObjectives: Boolean(next) });
  const orchestrationStats = persistOrchestrationStats(await collectOrchestrationStats());
  const measuredAt = orchestrationStats.measuredAt || new Date().toISOString();
  const openTasksTable = buildOpenTasksTableRows(objectives, measuredAt);
  const taskStatusTable = buildTaskStatusTableRows(objectives, measuredAt);
  const checkupTable = buildCheckupTable('objective.scan', next, measuredAt);
  const failureTable = buildFailureTable(checkupTable, orchestrationStats, measuredAt);
  const rowSemantics = assertTaskStatusSemantics(taskStatusTable, openTasksTable);
  validateStatsPayload(orchestrationStats);
  validateOpenTaskRows(openTasksTable);
  const openTasksPersisted = persistOpenTasksTable(openTasksTable, orchestrationStats);
  const notify = await notifyN8n('objective.scan', {
    openCount: openTasksTable.length,
    emitted,
    openTasksTable,
    orchestrationStats,
    taskStatusTable,
    checkupTable,
    failureTable,
    rowSemantics,
    keepalivePulse,
  });
  enforceOrchestrationDelivery(notify, policy);
  const request = buildNextRequest(next, notify, cycleGuard, { continuingActive, policy });

  printJson({
    action: 'loop-scan',
    openCount: openTasksTable.length,
    hasOpenObjectives: openTasksTable.length > 0,
    emitted,
    keepalivePulse,
    notified: notify,
    request,
    continuingActive,
    orchestrationStats,
    openTasksTable,
    taskStatusTable,
    checkupTable,
    failureTable,
    rowSemantics,
    cycleGuard,
    orchestrationPolicy: policy,
    ...openTasksPersisted,
  });
}

async function commandAssert() {
  normalizeOngoingWork();
  const markdown = readMarkdown();
  const objectives = parseObjectives(markdown);
  const orchestrationStats = persistOrchestrationStats(await collectOrchestrationStats());
  const measuredAt = orchestrationStats.measuredAt || new Date().toISOString();
  const openTasksTable = buildOpenTasksTableRows(objectives, measuredAt);
  const taskStatusTable = buildTaskStatusTableRows(objectives, measuredAt);
  validateStatsPayload(orchestrationStats);
  validateOpenTaskRows(openTasksTable);
  const rowSemantics = assertTaskStatusSemantics(taskStatusTable, openTasksTable);

  printJson({
    action: 'assert',
    assertions: {
      rowSemantics,
    },
    openCount: openTasksTable.length,
    orchestrationStats,
  });
}

async function main() {
  const [command = 'next', ...rest] = process.argv.slice(2);

  if (command === 'next') {
    await commandNext();
    return;
  }

  if (command === 'done') {
    await commandDone(rest);
    return;
  }

  if (command === 'partial') {
    await commandPartial(rest);
    return;
  }

  if (command === 'scan') {
    await commandLoop();
    return;
  }

  if (command === 'assert') {
    await commandAssert();
    return;
  }

  throw new Error(`Unsupported command: ${command}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`n8n-ongoing-cycle error: ${message}`);
  process.exit(1);
});
