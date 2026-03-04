import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function readRepoFile(...parts: string[]) {
  const filePath = path.join(process.cwd(), ...parts);
  return fs.readFileSync(filePath, 'utf8');
}

describe('GitHub security workflow rules', () => {
  it('security workflow includes core security scanners', () => {
    const workflow = readRepoFile('.github', 'workflows', 'security.yaml');

    expect(workflow).toContain('name: Security Analysis');
    expect(workflow).toContain('github/codeql-action/init@v3');
    expect(workflow).toContain('github/codeql-action/analyze@v3');
    expect(workflow).toContain('aquasecurity/trivy-action@master');
    expect(workflow).toContain('anchore/sbom-action@v0');
  });

  it('security workflow keeps restrictive permissions', () => {
    const workflow = readRepoFile('.github', 'workflows', 'security.yaml');

    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('actions: read');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('security-events: read');
  });

  it('security and test workflows avoid conflicting pnpm version pinning', () => {
    const securityWorkflow = readRepoFile('.github', 'workflows', 'security.yaml');
    const unitTestsWorkflow = readRepoFile('.github', 'workflows', 'unit-tests.yml');
    const setupAction = readRepoFile('.github', 'actions', 'setup-and-build', 'action.yaml');

    expect(securityWorkflow).toContain('uses: pnpm/action-setup@v4');
    expect(unitTestsWorkflow).toContain('uses: pnpm/action-setup@v4');

    expect(securityWorkflow).not.toMatch(/\n\s*version:\s*['"]?9(\.|\n|\r|$)/);
    expect(unitTestsWorkflow).not.toMatch(/\n\s*version:\s*['"]?9(\.|\n|\r|$)/);
    expect(setupAction).not.toContain('pnpm-version:');
  });

  it('docs workflow deploys via pages artifact flow (no direct gh-deploy)', () => {
    const docsWorkflow = readRepoFile('.github', 'workflows', 'docs.yaml');

    expect(docsWorkflow).toContain('actions/upload-pages-artifact@v3');
    expect(docsWorkflow).toContain('actions/deploy-pages@v4');
    expect(docsWorkflow).not.toContain('mkdocs gh-deploy --force');
  });
});
