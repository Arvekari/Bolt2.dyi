#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';

const startupTimeoutMs = Number(process.env.DOCKER_SMOKE_TIMEOUT_MS || 15000);

function runBuild() {
  console.log('Running production build for Docker/startup smoke...');

  const result = spawnSync('pnpm', ['-s', 'build'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if ((result.status ?? 1) !== 0) {
    console.error('❌ Build failed during Docker smoke check.');
    process.exit(result.status ?? 1);
  }
}

function runStartupSmoke() {
  console.log('Starting built server startup smoke check...');

  const child = spawn(process.execPath, ['build/server/index.js'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let finished = false;

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const done = (code, signal) => {
    if (finished) {
      return;
    }

    finished = true;

    if ((code ?? 0) !== 0 && signal !== 'SIGTERM') {
      console.error('❌ Built server exited with error during startup smoke check.');

      if (stdout.trim()) {
        console.error('--- startup stdout ---');
        console.error(stdout.trim());
      }

      if (stderr.trim()) {
        console.error('--- startup stderr ---');
        console.error(stderr.trim());
      }

      process.exit(code ?? 1);
    }

    console.log('✅ Built server startup smoke check passed.');
    process.exit(0);
  };

  const timer = setTimeout(() => {
    if (finished) {
      return;
    }

    child.kill();
    done(0, 'SIGTERM');
  }, startupTimeoutMs);

  child.on('exit', (code, signal) => {
    clearTimeout(timer);
    done(code, signal);
  });

  child.on('error', (error) => {
    clearTimeout(timer);

    if (!finished) {
      finished = true;
      const details = error instanceof Error ? error.message : String(error);
      console.error(`❌ Startup smoke check could not launch built server: ${details}`);
      process.exit(1);
    }
  });
}

runBuild();
runStartupSmoke();