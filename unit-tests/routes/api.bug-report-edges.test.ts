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

function buildValidForm() {
  const formData = new FormData();
  formData.append('title', 'Valid bug title');
  formData.append('description', 'A valid description with enough content to pass validation.');
  formData.append('includeEnvironmentInfo', 'false');
  return formData;
}

describe('/api/bug-report edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when payload is detected as spam', async () => {
    const formData = buildValidForm();
    formData.set('title', 'Buy now casino offer');

    const response = await action({
      request: new Request('http://localhost/api/bug-report', {
        method: 'POST',
        body: formData,
        headers: { 'cf-connecting-ip': '10.10.10.10' },
      }),
      context: { cloudflare: { env: { GITHUB_BUG_REPORT_TOKEN: 'token' } } },
    } as any);

    expect(response.status).toBe(400);
    expect(createIssueMock).not.toHaveBeenCalled();
  });

  it('returns 429 after too many requests from same IP', async () => {
    createIssueMock.mockResolvedValue({ data: { number: 1, html_url: 'https://example.com/1' } });

    for (let index = 0; index < 5; index += 1) {
      const response = await action({
        request: new Request('http://localhost/api/bug-report', {
          method: 'POST',
          body: buildValidForm(),
          headers: { 'cf-connecting-ip': '172.16.0.1' },
        }),
        context: { cloudflare: { env: { GITHUB_BUG_REPORT_TOKEN: 'token' } } },
      } as any);

      expect(response.status).toBe(200);
    }

    const blockedResponse = await action({
      request: new Request('http://localhost/api/bug-report', {
        method: 'POST',
        body: buildValidForm(),
        headers: { 'cf-connecting-ip': '172.16.0.1' },
      }),
      context: { cloudflare: { env: { GITHUB_BUG_REPORT_TOKEN: 'token' } } },
    } as any);

    expect(blockedResponse.status).toBe(429);
  });

  it('maps GitHub 403 to 503 response', async () => {
    createIssueMock.mockRejectedValue({ status: 403 });

    const response = await action({
      request: new Request('http://localhost/api/bug-report', {
        method: 'POST',
        body: buildValidForm(),
        headers: { 'cf-connecting-ip': '192.168.100.100' },
      }),
      context: { cloudflare: { env: { GITHUB_BUG_REPORT_TOKEN: 'token' } } },
    } as any);

    expect(response.status).toBe(503);
  });
});
