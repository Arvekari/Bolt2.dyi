import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createIssueMock } = vi.hoisted(() => ({
  createIssueMock: vi.fn(),
}));

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn(() => ({
    rest: {
      issues: {
        create: createIssueMock,
      },
    },
  })),
}));

import { action } from '~/routes/api.bug-report';

describe('/api/bug-report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 405 for non-POST request', async () => {
    const response = await action({
      request: new Request('http://localhost/api/bug-report', { method: 'GET' }),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(405);
  });

  it('returns 400 for invalid payload', async () => {
    const formData = new FormData();
    formData.append('title', 'Bug title');
    formData.append('description', 'short');

    const response = await action({
      request: new Request('http://localhost/api/bug-report', {
        method: 'POST',
        body: formData,
        headers: { 'cf-connecting-ip': '10.0.0.2' },
      }),
      context: { cloudflare: { env: { GITHUB_BUG_REPORT_TOKEN: 'token' } } },
    } as any);

    expect(response.status).toBe(400);
    expect(createIssueMock).not.toHaveBeenCalled();
  });

  it('returns 500 when github token is missing', async () => {
    const formData = new FormData();
    formData.append('title', 'Valid bug title');
    formData.append('description', 'A valid description with enough content.');
    formData.append('includeEnvironmentInfo', 'false');

    const response = await action({
      request: new Request('http://localhost/api/bug-report', {
        method: 'POST',
        body: formData,
        headers: { 'cf-connecting-ip': '10.0.0.3' },
      }),
      context: { cloudflare: { env: {} } },
    } as any);

    expect(response.status).toBe(500);
    expect(createIssueMock).not.toHaveBeenCalled();
  });

  it('creates github issue and returns success for valid request', async () => {
    createIssueMock.mockResolvedValue({
      data: {
        number: 123,
        html_url: 'https://github.com/stackblitz-labs/bolt.diy/issues/123',
      },
    });

    const formData = new FormData();
    formData.append('title', 'XSS <title>');
    formData.append('description', 'Description with <script> and enough valid length.');
    formData.append('stepsToReproduce', '1) Open /page');
    formData.append('includeEnvironmentInfo', 'true');
    formData.append('environmentInfo', JSON.stringify({ browser: 'Chrome', os: 'Windows' }));

    const response = await action({
      request: new Request('http://localhost/api/bug-report', {
        method: 'POST',
        body: formData,
        headers: { 'cf-connecting-ip': '10.0.0.4' },
      }),
      context: {
        cloudflare: {
          env: {
            GITHUB_BUG_REPORT_TOKEN: 'token',
            BUG_REPORT_REPO: 'stackblitz-labs/bolt.diy',
          },
        },
      },
    } as any);

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.issueNumber).toBe(123);
    expect(createIssueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'stackblitz-labs',
        repo: 'bolt.diy',
        title: 'XSS &lt;title&gt;',
      }),
    );
  });
});
