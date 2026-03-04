import { describe, expect, it, vi } from 'vitest';
import { createSampler } from '~/utils/sampler';

describe('utils/sampler', () => {
  it('executes immediately on first call and throttles within interval', async () => {
    vi.useFakeTimers();

    const fn = vi.fn();
    const sampled = createSampler(fn, 100);

    sampled('a');
    sampled('b');
    sampled('c');

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith('a');

    await vi.advanceTimersByTimeAsync(100);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('c');
  });

  it('executes immediately again after interval passes', async () => {
    vi.useFakeTimers();

    const fn = vi.fn();
    const sampled = createSampler(fn, 50);

    sampled('first');
    await vi.advanceTimersByTimeAsync(60);
    sampled('second');

    expect(fn).toHaveBeenNthCalledWith(1, 'first');
    expect(fn).toHaveBeenNthCalledWith(2, 'second');
  });
});
