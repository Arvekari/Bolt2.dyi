export const CURRENT_SCHEMA_VERSION = 2;

export function getPendingSchemaVersions(currentVersion: number): number[] {
  const from = Number.isFinite(currentVersion) ? Math.max(0, Math.floor(currentVersion)) : 0;

  if (from >= CURRENT_SCHEMA_VERSION) {
    return [];
  }

  const versions: number[] = [];

  for (let version = from + 1; version <= CURRENT_SCHEMA_VERSION; version += 1) {
    versions.push(version);
  }

  return versions;
}

export function needsMigration(currentVersion: number): boolean {
  return getPendingSchemaVersions(currentVersion).length > 0;
}
