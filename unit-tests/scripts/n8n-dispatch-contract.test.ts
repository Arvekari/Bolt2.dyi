import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('n8n ongoing dispatch contract guardrail', () => {
  it('requires completed-cycle restart impulse fields in workflow definition', () => {
    const scriptPath = resolve(process.cwd(), 'scripts', 'n8n-dev-orchestrator.mjs');
    const scriptSource = readFileSync(scriptPath, 'utf8');

    expect(scriptSource).toContain("name: 'jobPulse'");
    expect(scriptSource).toContain('start-new-ongoing-check-job');

    expect(scriptSource).toContain("name: 'restartCommand'");
    expect(scriptSource).toContain('pnpm run ongoing:cycle -- scan');

    expect(scriptSource).toContain("name: 'nextAction'");
    expect(scriptSource).toContain('Start a new ongoing-work check job immediately');

    expect(scriptSource).toContain("name: 'finalRemark'");
    expect(scriptSource).toContain('Trigger a fresh ongoing-work scan as a new job');

    const openCountReferenceCount = (scriptSource.match(/openCount/g) || []).length;
    expect(openCountReferenceCount).toBeGreaterThanOrEqual(5);
  });
});
