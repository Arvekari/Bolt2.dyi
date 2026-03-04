import { describe, expect, it, vi } from 'vitest';
import { bufferWatchEvents } from '~/utils/buffer';

describe('utils/buffer', () => {
  it('buffers events and flushes them in order', async () => {
    vi.stubGlobal('self', globalThis as any);
    vi.useFakeTimers();
    const callback = vi.fn();

    const push = bufferWatchEvents<[string]>(50, callback);
    push('a');
    push('b');

    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toEqual([['a'], ['b']]);
  });

  it('waits for previous async batch before processing next', async () => {
    vi.stubGlobal('self', globalThis as any);
    vi.useFakeTimers();
    const sequence: string[] = [];

    const callback = vi.fn(async (events: Array<[string]>) => {
      sequence.push(events.map((entry) => entry[0]).join(','));
      await Promise.resolve();
    });

    const push = bufferWatchEvents<[string]>(20, callback);
    push('x');
    await vi.advanceTimersByTimeAsync(20);

    push('y');
    await vi.advanceTimersByTimeAsync(20);

    expect(sequence).toEqual(['x', 'y']);
  });
});
