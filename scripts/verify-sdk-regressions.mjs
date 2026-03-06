#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const regressionTests = [
  'unit-tests/lib/services/services.mcp-service.test.ts',
  'unit-tests/lib/services/services.ai-sdk-mcp-compat.test.ts',
  'unit-tests/lib/server/stream-text.tools.test.ts',
  'unit-tests/architecture/layer-structure.test.ts',
];

const command = ['exec', 'vitest', 'run', ...regressionTests];

console.log('Running SDK regression test suite...');

const result = spawnSync('pnpm', command, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
