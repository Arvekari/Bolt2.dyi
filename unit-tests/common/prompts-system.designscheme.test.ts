import { describe, expect, it } from 'vitest';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';

describe('getSystemPrompt design scheme', () => {
  it('embeds design scheme payload in prompt', () => {
    const prompt = getSystemPrompt('/tmp', undefined, {
      font: { heading: 'Inter', body: 'Inter' },
      palette: { primary: '#000000', secondary: '#ffffff' },
      features: ['cards'],
    } as any);

    expect(prompt).toContain('Inter');
    expect(prompt).toContain('#000000');
    expect(prompt).toContain('cards');
  });
});
