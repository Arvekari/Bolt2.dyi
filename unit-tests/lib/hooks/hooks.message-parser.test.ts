import { describe, expect, it, vi } from 'vitest';

vi.mock('~/lib/runtime/enhanced-message-parser', () => ({
  EnhancedStreamingMessageParser: class {
    parse() {
      return '';
    }

    reset() {}
  },
}));

vi.mock('~/lib/stores/workbench', () => ({
  workbenchStore: {
    showWorkbench: { set: vi.fn() },
    addArtifact: vi.fn(),
    updateArtifact: vi.fn(),
    addAction: vi.fn(),
    runAction: vi.fn(),
  },
}));

vi.mock('~/utils/logger', () => ({
  createScopedLogger: () => ({ trace: vi.fn() }),
}));

describe('hooks/useMessageParser module', () => {
  it('loads exports', async () => {
    const module = await import('~/lib/hooks/useMessageParser');
    expect(module.useMessageParser).toBeDefined();
  });
});