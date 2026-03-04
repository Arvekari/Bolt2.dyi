import { describe, expect, it } from 'vitest';

describe('chat/AgentRunStatusPanel module', () => {
  it('loads exports', async () => {
    const module = await import('~/components/chat/AgentRunStatusPanel');
    expect(module.AgentRunStatusPanel).toBeDefined();
  });
});
