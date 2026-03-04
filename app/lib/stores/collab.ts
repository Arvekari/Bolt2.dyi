import { map } from 'nanostores';

export type CollabBranchMode = 'user' | 'main';

export const collabStore = map<{
  selectedProjectId?: string;
  selectedConversationId?: string;
  branchMode: CollabBranchMode;
  refreshToken: number;
}>({
  selectedProjectId: undefined,
  selectedConversationId: undefined,
  branchMode: 'user',
  refreshToken: 0,
});

export function setCollabProject(projectId?: string) {
  collabStore.setKey('selectedProjectId', projectId);
}

export function setCollabConversation(conversationId?: string) {
  collabStore.setKey('selectedConversationId', conversationId);
}

export function setCollabBranchMode(mode: CollabBranchMode) {
  collabStore.setKey('branchMode', mode);
}

export function bumpCollabRefresh() {
  collabStore.setKey('refreshToken', Date.now());
}
