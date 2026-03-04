import { describe, expect, it } from 'vitest';
import { unreachable } from '~/utils/unreachable';

describe('unreachable', () => {
  it('throws with prefixed message', () => {
    expect(() => unreachable('bad state')).toThrow('Unreachable: bad state');
  });
});
