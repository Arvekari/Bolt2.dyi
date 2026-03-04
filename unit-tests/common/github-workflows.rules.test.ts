import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readRepoFile(...parts: string[]) {
  const filePath = path.join(process.cwd(), ...parts);
  return fs.readFileSync(filePath, 'utf8');
}

describe('GitHub workflow rules', () => {
  it('docker publish workflow targets composed Dockerfile and production target', () => {
    const workflow = readRepoFile('.github', 'workflows', 'docker.yaml');

    expect(workflow).toContain('IMAGE_NAME: arvekari/ebolt2');
    expect(workflow).toContain('file: docs/docker/composed/Dockerfile');
    expect(workflow).toContain('target: bolt2-dyi-production');
  });

  it('ci docker validation workflow uses composed docker paths', () => {
    const workflow = readRepoFile('.github', 'workflows', 'ci.yaml');

    expect(workflow).toContain('docker build -f docs/docker/composed/Dockerfile --target bolt2-dyi-production');
    expect(workflow).toContain('docker build -f docs/docker/composed/Dockerfile --target development');
    expect(workflow).toContain('docker compose -f docs/docker/composed/docker-compose.yaml config --quiet');
  });

  it('shared setup action does not pin pnpm version', () => {
    const action = readRepoFile('.github', 'actions', 'setup-and-build', 'action.yaml');

    expect(action).toContain('uses: pnpm/action-setup@v4');
    expect(action).not.toContain('pnpm-version:');
    expect(action).not.toMatch(/\n\s*version:\s*['"]?9/);
  });

  it('docs workflow uses pages artifact deployment flow', () => {
    const workflow = readRepoFile('.github', 'workflows', 'docs.yaml');

    expect(workflow).toContain('actions/upload-pages-artifact@v3');
    expect(workflow).toContain('actions/deploy-pages@v4');
    expect(workflow).toContain('mkdocs build --strict -f docs/mkdocs.yml');
  });
});
