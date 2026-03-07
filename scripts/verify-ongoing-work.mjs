#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ongoingPath = resolve('.ongoing-work.md');
const maxAgeHours = Number(process.env.ONGOING_WORK_MAX_AGE_HOURS || 12);

function fail(message) {
  console.error(message);
  process.exit(1);
}

let content = '';

try {
  content = readFileSync(ongoingPath, 'utf8');
} catch (error) {
  const details = error instanceof Error ? error.message : String(error);
  fail(`❌ Unable to read .ongoing-work.md: ${details}`);
}

const requiredPrefixes = ['Current step now:', 'Last command run:', 'Next exact command:'];

for (const prefix of requiredPrefixes) {
  const line = content
    .split(/\r?\n/)
    .find((entry) => {
      const normalized = entry.trimStart().replace(/^[-*]\s+/, '');
      return normalized.startsWith(prefix);
    });

  if (!line) {
    fail(`❌ Missing required line in .ongoing-work.md: "${prefix}"`);
  }

  const normalizedLine = line.trimStart().replace(/^[-*]\s+/, '');
  const value = normalizedLine.slice(normalizedLine.indexOf(prefix) + prefix.length).trim();

  if (!value || ['tbd', 'todo', '-', 'n/a', 'none'].includes(value.toLowerCase())) {
    fail(`❌ .ongoing-work.md has empty/incomplete value for: "${prefix}"`);
  }
}

let stats;

try {
  stats = statSync(ongoingPath);
} catch (error) {
  const details = error instanceof Error ? error.message : String(error);
  fail(`❌ Unable to stat .ongoing-work.md: ${details}`);
}

const ageMs = Date.now() - stats.mtimeMs;
const maxAgeMs = maxAgeHours * 60 * 60 * 1000;

if (ageMs > maxAgeMs) {
  const ageHours = (ageMs / (60 * 60 * 1000)).toFixed(1);
  fail(
    `❌ .ongoing-work.md is stale (${ageHours}h old). Update it before commit/push (threshold ${maxAgeHours}h).`,
  );
}

console.log('✅ Ongoing-work check passed.');