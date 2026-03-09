#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolveListenerConfigPathForAgent } from './listener-config-resolution.mjs';

function normalizeReturnAddress(returnAddress = {}) {
  const protocol = String(returnAddress.protocol || 'http').trim() || 'http';
  const port = Number(returnAddress.port || 8788);
  const fqdn = String(returnAddress.fqdn || '').trim();
  const ip = String(returnAddress.ip || '').trim();
  const preferred = String(returnAddress.hostSelection || returnAddress.mode || 'fqdn').trim().toLowerCase();
  const hostSelection = preferred === 'ip' ? 'ip' : 'fqdn';
  const host = hostSelection === 'ip' ? ip || fqdn : fqdn || ip;

  return {
    protocol,
    port,
    host,
  };
}

function resolveKeepaliveCallbackUrl() {
  const configPath = resolveListenerConfigPathForAgent().path;

  if (!configPath) {
    return 'http://localhost:8788/task-keepalive';
  }

  try {
    const parsed = JSON.parse(readFileSync(configPath, 'utf8'));
    const returnAddress = normalizeReturnAddress(parsed?.returnAddress || {});
    const keepalivePathRaw = String(parsed?.endpoints?.taskKeepAlive || '/task-keepalive').trim() || '/task-keepalive';
    const keepalivePath = keepalivePathRaw.startsWith('/') ? keepalivePathRaw : `/${keepalivePathRaw}`;

    if (!returnAddress.host) {
      return 'http://localhost:8788/task-keepalive';
    }

    return `${returnAddress.protocol}://${returnAddress.host}:${returnAddress.port}${keepalivePath}`;
  } catch {
    return 'http://localhost:8788/task-keepalive';
  }
}

function parseArgs(argv) {
  const args = {
    count: 3,
    intervalSeconds: 20,
    callbackUrl: resolveKeepaliveCallbackUrl(),
    source: 'existing-n8n-keepalive-cadence',
    taskPrefix: 'existing-n8n-keepalive',
    status: 'in_progress',
    activeTask: true,
    silent: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];

    if (token === '--count' && argv[index + 1]) {
      const value = Number(argv[++index]);
      if (Number.isFinite(value) && value >= 0) {
        args.count = Math.floor(value);
      }
      continue;
    }

    if (token === '--interval-seconds' && argv[index + 1]) {
      const value = Number(argv[++index]);
      if (Number.isFinite(value) && value >= 0) {
        args.intervalSeconds = value;
      }
      continue;
    }

    if (token === '--callback-url' && argv[index + 1]) {
      args.callbackUrl = String(argv[++index]).trim() || args.callbackUrl;
      continue;
    }

    if (token === '--source' && argv[index + 1]) {
      args.source = String(argv[++index]).trim() || args.source;
      continue;
    }

    if (token === '--task-prefix' && argv[index + 1]) {
      args.taskPrefix = String(argv[++index]).trim() || args.taskPrefix;
      continue;
    }

    if (token === '--status' && argv[index + 1]) {
      args.status = String(argv[++index]).trim() || args.status;
      continue;
    }

    if (token === '--active-task' && argv[index + 1]) {
      const value = String(argv[++index]).trim().toLowerCase();
      args.activeTask = value === '1' || value === 'true' || value === 'yes' || value === 'on';
      continue;
    }

    if (token === '--silent') {
      args.silent = true;
    }
  }

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getN8nConfig() {
  const endpoint =
    process.env.N8N_BASE_URL ||
    process.env.N8N_ENDPOINT ||
    process.env.n8n_base_url ||
    process.env.n8n_endpoint ||
    '';
  const webhookBase =
    process.env.N8N_WEBHOOK_BASE_URL ||
    process.env.N8N_WEBHOOK_URL ||
    process.env.n8n_webhook_base_url ||
    process.env.n8n_webhook_url ||
    '';
  const apiKey =
    process.env.N8N_API_KEY ||
    process.env.N8N_APIKEY ||
    process.env.n8n_api_key ||
    process.env.n8n_apikey ||
    '';

  const normalizedEndpoint = String(endpoint).trim().replace(/\/$/, '');
  const normalizedWebhook = String(webhookBase).trim().replace(/\/$/, '');
  const candidates = new Set();

  if (normalizedWebhook) {
    candidates.add(normalizedWebhook);
  }

  if (normalizedEndpoint) {
    candidates.add(normalizedEndpoint);
    candidates.add(normalizedEndpoint.replace(/\/api(?:\/v\d+)?$/i, ''));
  }

  return {
    webhookBaseUrls: Array.from(candidates).filter(Boolean),
    apiKey: String(apiKey).trim(),
  };
}

function buildReturnAddress(callbackUrl) {
  try {
    const parsed = new URL(callbackUrl);
    return {
      protocol: parsed.protocol.replace(':', ''),
      hostSelection: /^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsed.hostname) ? 'ip' : 'fqdn',
      ip: /^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsed.hostname) ? parsed.hostname : '',
      fqdn: /^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsed.hostname) ? '' : parsed.hostname,
      port: parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80,
      path: parsed.pathname || '/task-keepalive',
    };
  } catch {
    return {
      protocol: 'http',
      hostSelection: 'ip',
      ip: '172.17.132.107',
      fqdn: '',
      port: 8788,
      path: '/task-keepalive',
    };
  }
}

async function triggerKeepalivePulse({ targetUrl, callbackUrl, source, status, activeTask, taskId, pulse }) {
  const body = {
    taskId,
    text: `keepalive pulse #${pulse}`,
    callbackUrl,
    returnAddress: buildReturnAddress(callbackUrl),
    payload: {
      source,
      status,
      pulse,
      activeTask,
    },
  };

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed = null;

  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsed,
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const { webhookBaseUrls } = getN8nConfig();

  if (webhookBaseUrls.length === 0) {
    throw new Error('missing n8n webhook base url (set N8N_BASE_URL/N8N_ENDPOINT or N8N_WEBHOOK_BASE_URL)');
  }

  const pathTargets = ['/webhook/machine-task-push-sync', '/webhook-prod/machine-task-push-sync'];
  const loopCount = args.count === 0 ? Number.POSITIVE_INFINITY : args.count;
  const results = [];
  let pulse = 0;

  while (pulse < loopCount) {
    pulse += 1;
    const taskId = `${args.taskPrefix}-${pulse}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
    let delivered = false;
    let lastError = '';

    for (const base of webhookBaseUrls) {
      for (const pathTarget of pathTargets) {
        const targetUrl = `${base}${pathTarget}`;

        try {
          const response = await triggerKeepalivePulse({
            targetUrl,
            callbackUrl: args.callbackUrl,
            source: args.source,
            status: args.status,
            activeTask: args.activeTask,
            taskId,
            pulse,
          });

          if (response.ok) {
            delivered = true;
            results.push({
              pulse,
              taskId,
              targetUrl,
              deliveryStatus: response.body?.deliveryStatus || 'delivered',
              deliveryError: response.body?.deliveryError || '',
              emittedAt: new Date().toISOString(),
            });
            break;
          }

          lastError = `status=${response.status}`;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }

      if (delivered) {
        break;
      }
    }

    if (!delivered) {
      results.push({
        pulse,
        taskId,
        targetUrl: '',
        deliveryStatus: 'failed',
        deliveryError: lastError || 'all targets failed',
        emittedAt: new Date().toISOString(),
      });
    }

    if (pulse < loopCount && args.intervalSeconds > 0) {
      await sleep(Math.round(args.intervalSeconds * 1000));
    }
  }

  const output = {
    ok: results.every((item) => item.deliveryStatus !== 'failed'),
    mode: args.count === 0 ? 'continuous' : 'bounded',
    requestedCount: args.count,
    intervalSeconds: args.intervalSeconds,
    callbackUrl: args.callbackUrl,
    source: args.source,
    results,
  };

  if (!args.silent) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } else {
    process.stdout.write(
      `${JSON.stringify({
        ok: output.ok,
        sent: results.length,
        callbackUrl: args.callbackUrl,
        returnAddress: buildReturnAddress(args.callbackUrl),
      })}\n`,
    );
  }

  if (!output.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`n8n-keepalive-cadence error: ${message}`);
  process.exit(1);
});
