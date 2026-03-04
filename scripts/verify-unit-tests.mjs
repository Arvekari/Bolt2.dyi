import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

function getChangedFiles() {
  try {
    const output = execSync('git diff --name-only --diff-filter=ACMR HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();

    if (!output) {
      return [];
    }

    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isSourceFile(file) {
  if (!file.startsWith('app/')) {
    return false;
  }

  if (!/\.(ts|tsx|js|jsx)$/.test(file)) {
    return false;
  }

  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file)) {
    return false;
  }

  if (file.endsWith('.d.ts')) {
    return false;
  }

  return true;
}

function hasMatchingTest(file) {
  const ext = path.extname(file);
  const base = file.slice(0, -ext.length);
  const relNoApp = file.replace(/^app\//, '');
  const relBase = relNoApp.slice(0, -ext.length);

  const candidates = [
    `${base}.test${ext}`,
    `${base}.spec${ext}`,
    `unit-tests/${relBase}.test.ts`,
    `unit-tests/${relBase}.spec.ts`,
  ];

  return candidates.some((candidate) => existsSync(candidate));
}

const changed = getChangedFiles();

if (changed.length === 0) {
  console.log('No changed files detected by git diff; skipping unit-test mapping check.');
  process.exit(0);
}

const sourceFiles = changed.filter(isSourceFile);
const missing = sourceFiles.filter((file) => !hasMatchingTest(file));

if (missing.length > 0) {
  console.error('Missing unit tests for changed source files:');
  for (const file of missing) {
    console.error(` - ${file}`);
  }
  console.error('\nAdd corresponding *.test.* or *.spec.* files before merge.');
  process.exit(1);
}

console.log('Unit-test mapping check passed for changed files.');
