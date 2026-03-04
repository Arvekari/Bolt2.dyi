import { describe, expect, it } from 'vitest';
import { getFineTunedPrompt } from '~/lib/common/prompts/new-prompt';

describe('getFineTunedPrompt design scheme', () => {
  it('contains serialized design scheme content', () => {
    const prompt = getFineTunedPrompt('/tmp', undefined, {
      font: { heading: 'Playfair', body: 'Inter' },
      palette: { primary: '#111111', secondary: '#eeeeee' },
      features: ['parallax', 'motion'],
    } as any);

    expect(prompt).toContain('Playfair');
    expect(prompt).toContain('parallax');
  });
});
