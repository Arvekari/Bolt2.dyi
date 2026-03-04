import { describe, expect, it } from 'vitest';
import { TOOL_EXECUTION_APPROVAL } from '~/utils/constants';

describe('constants approvals', () => {
  it('contains approve and reject text', () => {
    expect(TOOL_EXECUTION_APPROVAL.APPROVE).toContain('approved');
    expect(TOOL_EXECUTION_APPROVAL.REJECT).toContain('rejected');
  });
});
