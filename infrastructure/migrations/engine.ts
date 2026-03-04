export type MigrationEngine = 'sqlite' | 'postgrest';

export function createMigrationPlan(input: {
  engine: MigrationEngine;
  currentVersion: number;
  targetVersion: number;
}) {
  const currentVersion = Number.isFinite(input.currentVersion) ? Math.max(0, Math.floor(input.currentVersion)) : 0;
  const targetVersion = Number.isFinite(input.targetVersion) ? Math.max(0, Math.floor(input.targetVersion)) : 0;

  const pendingVersions: number[] = [];

  for (let version = currentVersion + 1; version <= targetVersion; version += 1) {
    pendingVersions.push(version);
  }

  return {
    engine: input.engine,
    currentVersion,
    targetVersion,
    pendingVersions,
  };
}
