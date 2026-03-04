import { describe, expect, it } from 'vitest';

describe('services/importExportService module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/services/importExportService');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});