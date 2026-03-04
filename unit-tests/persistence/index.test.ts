import { describe, expect, it } from 'vitest';
import * as persistence from '~/lib/persistence';

describe('persistence/index barrel exports', () => {
  it('exports localStorage helpers', () => {
    expect(typeof persistence.getLocalStorage).toBe('function');
    expect(typeof persistence.setLocalStorage).toBe('function');
  });

  it('exports database helpers', () => {
    expect(typeof persistence.openDatabase).toBe('function');
    expect(typeof persistence.getAll).toBe('function');
    expect(typeof persistence.setMessages).toBe('function');
  });

  it('exports chat history hook helpers', () => {
    expect(typeof persistence.useChatHistory).toBe('function');
  });
});
