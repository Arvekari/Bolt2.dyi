export type CoreEngine = 'llm' | 'openclaw' | 'workflow';

export function resolveExecutionEngine(input: { provider: string; model: string }): CoreEngine {
  const provider = input.provider.toLowerCase();
  const model = input.model.toLowerCase();

  if (provider === 'openclaw' || model.includes('openclaw')) {
    return 'openclaw';
  }

  if (model.includes('workflow') || provider === 'workflow') {
    return 'workflow';
  }

  return 'llm';
}
