import { describe, expect, it } from 'vitest';
import { MODEL_REGEX, PROVIDER_REGEX } from '~/utils/constants';

describe('constants regex', () => {
  it('matches model and provider prefixes', () => {
    expect('[Model: abc]\n\nhello'.match(MODEL_REGEX)?.[1]).toBe('abc');
    expect('[Provider: xyz]\n\nhello'.match(PROVIDER_REGEX)?.[1]).toBe('xyz');
  });
});
