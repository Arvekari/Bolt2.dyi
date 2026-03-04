import { describe, expect, it } from 'vitest';
import { TOOL_EXECUTION_DENIED, TOOL_EXECUTION_ERROR, TOOL_NO_EXECUTE_FUNCTION } from '~/utils/constants';

describe('constants tool errors', () => {
  it('exports stable tool error strings', () => {
    expect(TOOL_NO_EXECUTE_FUNCTION).toContain('No execute function');
    expect(TOOL_EXECUTION_DENIED).toContain('denied');
    expect(TOOL_EXECUTION_ERROR).toContain('error');
  });
});
