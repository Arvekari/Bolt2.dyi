import { describe, expect, it, vi } from 'vitest';

const { streamTextMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn(),
}));

vi.mock('~/lib/.server/llm/stream-text', () => ({
  streamText: streamTextMock,
}));

import { executeCoreChatStream } from '~/core/chat-engine';

describe('core chat-engine', () => {
  it('delegates to streamText with normalized core options', async () => {
    streamTextMock.mockResolvedValue({ textStream: ['ok'] });

    const result = await executeCoreChatStream({
      system: 'sys',
      message: 'hello',
      env: {},
    });

    expect(streamTextMock).toHaveBeenCalledTimes(1);
    expect(result.textStream).toEqual(['ok']);
  });
});
