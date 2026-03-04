import { describe, it, expect, beforeEach } from 'vitest';
import {
  collabStore,
  setCollabProject,
  setCollabConversation,
  setCollabBranchMode,
  bumpCollabRefresh,
} from '~/lib/stores/collab';

describe('collabStore', () => {
  beforeEach(() => {
    collabStore.set({
      selectedProjectId: undefined,
      selectedConversationId: undefined,
      branchMode: 'user',
      refreshToken: 0,
    });
  });

  it('updates project and conversation selection', () => {
    setCollabProject('p1');
    setCollabConversation('c1');

    const value = collabStore.get();
    expect(value.selectedProjectId).toBe('p1');
    expect(value.selectedConversationId).toBe('c1');
  });

  it('switches branch mode', () => {
    setCollabBranchMode('main');
    expect(collabStore.get().branchMode).toBe('main');
  });

  it('bumps refresh token', () => {
    const before = collabStore.get().refreshToken;
    bumpCollabRefresh();
    const after = collabStore.get().refreshToken;

    expect(after).toBeGreaterThanOrEqual(before);
  });
});
