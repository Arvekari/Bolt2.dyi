#!/usr/bin/env node

import { appendFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const LOG_DIR = resolve('bolt.work/n8n');

function parseArgs(argv) {
  const options = {
    cycles: 0,
    intervalMs: 0,
    stopOnError: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];

    if (token === '--cycles' && argv[index + 1]) {
      const value = Number(argv[index + 1]);

      if (Number.isFinite(value) && value >= 0) {
        options.cycles = Math.floor(value);
      }

      index += 1;
      continue;
    }

    if (token === '--interval-ms' && argv[index + 1]) {
      const value = Number(argv[index + 1]);

      if (Number.isFinite(value) && value >= 0) {
        options.intervalMs = Math.floor(value);
      }

      index += 1;
      continue;
    }

    if (token === '--stop-on-error') {
      options.stopOnError = true;
      continue;
    }

    if (token === '--json') {
      options.json = true;
    }
  }

  return options;
}

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function runNodeScript(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: resolve('.'),
    encoding: 'utf8',
  });

  return {
    command: `node ${args.join(' ')}`,
    exitCode: Number(result.status ?? 1),
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
  };
}

function tailLines(text, maxLines = 10) {
  if (!text) {
    return [];
  }

  return String(text)
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-maxLines);
}

function buildCycleResult(cycle) {
  const startedAt = nowIso();

  const verify = runNodeScript(['scripts/verify-ongoing-work.mjs']);
  const syncOpenTasks = runNodeScript(['scripts/n8n-dev-orchestrator.mjs', 'sync-open-tasks']);
  const bridgePrompt = runNodeScript(['scripts/ongoing-work-bridge.mjs', 'prompt']);
  const next = runNodeScript(['scripts/n8n-ongoing-cycle.mjs', 'next']);

  const endedAt = nowIso();

  return {
    cycle,
    startedAt,
    endedAt,
    ok: verify.exitCode === 0 && syncOpenTasks.exitCode === 0 && bridgePrompt.exitCode === 0 && next.exitCode === 0,
    steps: {
      verify: {
        exitCode: verify.exitCode,
        command: verify.command,
        tail: tailLines(verify.stdout || verify.stderr, 6),
      },
      syncOpenTasks: {
        exitCode: syncOpenTasks.exitCode,
        command: syncOpenTasks.command,
        tail: tailLines(syncOpenTasks.stdout || syncOpenTasks.stderr, 8),
      },
      bridgePrompt: {
        exitCode: bridgePrompt.exitCode,
        command: bridgePrompt.command,
        tail: tailLines(bridgePrompt.stdout || bridgePrompt.stderr, 8),
      },
      next: {
        exitCode: next.exitCode,
        command: next.command,
        tail: tailLines(next.stdout || next.stderr, 8),
      },
    },
  };
}

function writeLog(logPath, payload) {
  appendFileSync(logPath, `${JSON.stringify(payload)}\n`, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

  mkdirSync(LOG_DIR, { recursive: true });

  const logPath = resolve(LOG_DIR, `ongoing-cycle-daemon-${stamp}.jsonl`);

  const startBanner = {
    type: 'daemon.start',
    at: nowIso(),
    options,
    cwd: resolve('.'),
    logPath,
  };

  writeLog(logPath, startBanner);

  let cycle = 0;

  while (true) {
    cycle += 1;
    const cycleResult = buildCycleResult(cycle);
    writeLog(logPath, cycleResult);

    if (options.json) {
      process.stdout.write(`${JSON.stringify(cycleResult)}\n`);
    } else {
      const verifyExit = cycleResult.steps.verify.exitCode;
      const syncExit = cycleResult.steps.syncOpenTasks.exitCode;
      const bridgePromptExit = cycleResult.steps.bridgePrompt.exitCode;
      const nextExit = cycleResult.steps.next.exitCode;
      process.stdout.write(
        `[${new Date().toLocaleTimeString()}] cycle ${cycle}` +
          ` | verify=${verifyExit} sync=${syncExit} bridgePrompt=${bridgePromptExit} next=${nextExit} ok=${cycleResult.ok}\n`,
      );
    }

    if (!cycleResult.ok && options.stopOnError) {
      const stopEvent = {
        type: 'daemon.stop',
        at: nowIso(),
        reason: 'stop-on-error',
        cycle,
      };
      writeLog(logPath, stopEvent);
      process.exit(1);
    }

    if (options.cycles > 0 && cycle >= options.cycles) {
      const stopEvent = {
        type: 'daemon.stop',
        at: nowIso(),
        reason: 'cycle-limit-reached',
        cycle,
      };
      writeLog(logPath, stopEvent);
      break;
    }

    if (options.intervalMs > 0) {
      await sleep(options.intervalMs);
    }
  }

  process.stdout.write(`log: ${logPath}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`ongoing-cycle-daemon error: ${message}\n`);
  process.exit(1);
});
