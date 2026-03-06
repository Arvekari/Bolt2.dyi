import { execSync } from 'node:child_process';

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
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

function isChangelogTouched() {
  try {
    const output = execSync('git diff --cached --name-only -- changelog.md', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();

    return output.length > 0;
  } catch {
    return false;
  }
}

const stagedFiles = getStagedFiles();

if (stagedFiles.length === 0) {
  console.log('No staged changes detected; skipping changelog check.');
  process.exit(0);
}

if (!isChangelogTouched()) {
  console.error('changelog.md is not staged.');
  console.error('Rule: update changelog.md before every commit.');
  process.exit(1);
}

console.log('Changelog check passed.');
