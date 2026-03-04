export type ToolExecutionContract = {
  toolName: string;
  args: Record<string, unknown>;
  requestId?: string;
};

export type ToolExecutionResultContract = {
  ok: boolean;
  output?: string;
  error?: string;
};
