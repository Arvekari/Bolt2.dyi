import { describe, expect, it } from 'vitest';
import { STARTER_TEMPLATES } from '~/utils/constants';

describe('constants starter templates', () => {
  it('contains starter template metadata', () => {
    expect(Array.isArray(STARTER_TEMPLATES)).toBe(true);
    expect(STARTER_TEMPLATES.length).toBeGreaterThan(0);
    expect(STARTER_TEMPLATES.some((template) => template.name === 'Expo App')).toBe(true);
  });
});
