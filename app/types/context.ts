export type ContextAnnotation =
  | {
      type: 'codeContext';
      files: string[];
    }
  | {
      type: 'chatSummary';
      summary: string;
      chatId: string;
    };

export type ProgressAnnotation = {
  type: 'progress';
  label: string;
  status: 'in-progress' | 'complete';
  order: number;
  message: string;
};

export type ToolCallAnnotation = {
  type: 'toolCall';
  toolCallId: string;
  serverName: string;
  toolName: string;
  toolDescription: string;
};

export type AgentRunData = {
  type: 'agentRun';
  run: {
    runId: string;
    state: string;
    steps: Array<{
      id: string;
      label: string;
      state: string;
    }>;
    error?: {
      message: string;
    };
  };
};

export type DebugStreamEvent = {
  type: 'debugStream';
  eventId: string;
  source: string;
  phase: 'start' | 'complete';
  message: string;
  requestId?: string;
  clientRequestId?: string;
  provider?: string;
  model?: string;
  normalizedArtifactApplied?: boolean;
  originalResponsePreview?: string;
  retryInstructionPreview?: string;
  retryResponsePreview?: string;
};
