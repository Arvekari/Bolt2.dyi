import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function collectTsFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry);
    const info = statSync(fullPath);

    if (info.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
      continue;
    }

    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }

  return files;
}

function assertNoImportMatch(files: string[], forbiddenPatterns: RegExp[]): void {
  const offenders: string[] = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf8');
    const hasForbiddenImport = forbiddenPatterns.some((pattern) => pattern.test(content));

    if (hasForbiddenImport) {
      offenders.push(filePath.replace(/\\/g, '/'));
    }
  }

  expect(offenders).toEqual([]);
}

describe('layer dependency direction', () => {
  it('prevents core from importing platform', () => {
    const files = collectTsFiles('core');

    assertNoImportMatch(files, [/from\s+['"]~\/platform\//, /from\s+['"]\.\.\/?\.?.*platform\//]);
  });

  it('prevents ui from importing integrations directly', () => {
    const files = collectTsFiles('ui');

    assertNoImportMatch(files, [
      /from\s+['"]~\/integrations\//,
      /from\s+['"]\.\.\/?\.?.*integrations\//,
      /from\s+['"]integrations\//,
    ]);
  });

  it('prevents integrations from importing ui', () => {
    const files = collectTsFiles('integrations');

    assertNoImportMatch(files, [/from\s+['"]~\/ui\//, /from\s+['"]\.\.\/?\.?.*ui\//]);
  });
});
