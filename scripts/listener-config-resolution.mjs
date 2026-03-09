import { existsSync } from 'node:fs';
import { hostname } from 'node:os';
import { resolve } from 'node:path';

const WORKSPACE_AGENT_CONFIG_TEMPLATE = (agentId) => resolve('..', `listener-config.${agentId}.json`);
const ROOT_AGENT_CONFIG_TEMPLATE = (agentId) => resolve(`listener-config.${agentId}.json`);
const LEGACY_AGENT_CONFIG_TEMPLATE = (agentId) => resolve('bolt.work/n8n', `listener-config.${agentId}.json`);

const WORKSPACE_CONFIG_PATH = resolve('..', 'listener-config.json');
const ROOT_CONFIG_PATH = resolve('listener-config.json');
const LEGACY_CONFIG_PATH = resolve('bolt.work/n8n/listener-config.json');

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

export function resolveAgentIdentity() {
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

function unique(items) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    if (!item || seen.has(item)) {
      continue;
    }

    seen.add(item);
    output.push(item);
  }

  return output;
}

export function resolveListenerConfigPathForAgent(options = {}) {
  const { agentId } = resolveAgentIdentity();

  const agentCandidates = unique([
    WORKSPACE_AGENT_CONFIG_TEMPLATE(agentId),
    ROOT_AGENT_CONFIG_TEMPLATE(agentId),
    LEGACY_AGENT_CONFIG_TEMPLATE(agentId),
  ]);

  for (const candidate of agentCandidates) {
    if (existsSync(candidate)) {
      return {
        path: candidate,
        agentId,
        mode: 'agent-specific',
        searched: [...agentCandidates, WORKSPACE_CONFIG_PATH, ROOT_CONFIG_PATH, LEGACY_CONFIG_PATH],
      };
    }
  }

  const fallbackCandidates = [WORKSPACE_CONFIG_PATH, ROOT_CONFIG_PATH, LEGACY_CONFIG_PATH];

  for (const candidate of fallbackCandidates) {
    if (existsSync(candidate)) {
      return {
        path: candidate,
        agentId,
        mode: 'default',
        searched: [...agentCandidates, ...fallbackCandidates],
      };
    }
  }

  return {
    path: String(options.defaultPath || ''),
    agentId,
    mode: 'missing',
    searched: [...agentCandidates, ...fallbackCandidates],
  };
}