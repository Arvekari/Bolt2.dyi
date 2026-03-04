import { describe, expect, it } from 'vitest';

import { createMigrationPlan } from '~/infrastructure/migrations/engine';

describe('migration engine', () => {
  it('creates migration plan for sqlite and postgrest', () => {
    const sqlitePlan = createMigrationPlan({ engine: 'sqlite', currentVersion: 0, targetVersion: 3 });
    const postgrestPlan = createMigrationPlan({ engine: 'postgrest', currentVersion: 1, targetVersion: 3 });

    expect(sqlitePlan.pendingVersions).toEqual([1, 2, 3]);
    expect(postgrestPlan.pendingVersions).toEqual([2, 3]);
  });

  it('returns empty plan when up-to-date', () => {
    const plan = createMigrationPlan({ engine: 'sqlite', currentVersion: 3, targetVersion: 3 });
    expect(plan.pendingVersions).toEqual([]);
  });
});
