import { describe, expect, it } from 'vitest';

import { resolveExecutionEngine } from '~/core/model-router';

describe('core model-router', () => {
  it('routes explicit openclaw provider to openclaw engine', () => {
    expect(resolveExecutionEngine({ provider: 'openclaw', model: 'agent-xl' })).toBe('openclaw');
  });

  it('routes workflow model family to workflow engine', () => {
    expect(resolveExecutionEngine({ provider: 'chat', model: 'workflow-planner-v1' })).toBe('workflow');
  });

  it('defaults to llm engine', () => {
    expect(resolveExecutionEngine({ provider: 'openai', model: 'gpt-4o-mini' })).toBe('llm');
  });
});
