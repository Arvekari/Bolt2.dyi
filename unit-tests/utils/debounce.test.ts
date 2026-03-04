import { describe, expect, it, vi } from 'vitest';
import { debounce } from '~/utils/debounce';

describe('debounce', () => {
  it('calls function once with latest arguments', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced('first');
    debounced('second');
    debounced('third');

    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
    vi.useRealTimers();
  });
});
