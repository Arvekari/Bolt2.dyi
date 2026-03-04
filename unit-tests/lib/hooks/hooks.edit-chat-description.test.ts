import { describe, expect, it, vi } from 'vitest';

vi.mock('@nanostores/react', () => ({
  useStore: () => 'chat-1',
}));

vi.mock('react-toastify', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('~/lib/persistence', () => ({
  chatId: { get: () => 'chat-1' },
  db: null,
  description: { get: () => 'Initial', set: vi.fn() },
  getMessages: vi.fn(),
  updateChatDescription: vi.fn(),
}));

describe('hooks/useEditChatDescription module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useEditChatDescription');
    expect(module.useEditChatDescription).toBeDefined();
  });
});