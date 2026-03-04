import { describe, expect, it } from 'vitest';

import { CURRENT_SCHEMA_VERSION, getPendingSchemaVersions, needsMigration } from '~/platform/persistence/schema-version';

describe('schema-version', () => {
  it('returns pending versions from current db version to target', () => {
    const pending = getPendingSchemaVersions(1);

    expect(pending.length).toBeGreaterThan(0);
    expect(pending[pending.length - 1]).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('returns no pending versions when already up-to-date', () => {
    expect(getPendingSchemaVersions(CURRENT_SCHEMA_VERSION)).toEqual([]);
    expect(needsMigration(CURRENT_SCHEMA_VERSION)).toBe(false);
  });

  it('detects migration requirement when db behind target', () => {
    expect(needsMigration(CURRENT_SCHEMA_VERSION - 1)).toBe(true);
  });
});
