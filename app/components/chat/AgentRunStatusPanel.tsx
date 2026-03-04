type AgentRunView = {
  runId: string;
  state: string;
  steps: Array<{
    id: string;
    label: string;
    state: string;
  }>;
  error?: {
    message?: string;
  };
};

interface AgentRunStatusPanelProps {
  run: AgentRunView | null;
}

export function AgentRunStatusPanel({ run }: AgentRunStatusPanelProps) {
  if (!run) {
    return null;
  }

  return (
    <div className="border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-2 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-bolt-elements-textPrimary">Agent run</div>
        <div className="text-xs text-bolt-elements-textSecondary">{run.state}</div>
      </div>
      <div className="text-xs text-bolt-elements-textSecondary mb-2">Run ID: {run.runId}</div>
      <div className="space-y-1">
        {run.steps.map((step) => (
          <div key={step.id} className="text-xs flex justify-between gap-2">
            <span className="text-bolt-elements-textPrimary">{step.label}</span>
            <span className="text-bolt-elements-textSecondary">{step.state}</span>
          </div>
        ))}
      </div>
      {run.error?.message && <div className="text-xs mt-2 text-bolt-elements-icon-error">{run.error.message}</div>}
    </div>
  );
}
