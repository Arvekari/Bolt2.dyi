import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createScopedLogger, logger } from '~/utils/logger';

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('respects log level filtering', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.setLevel('none');
    logger.info('hidden');
    expect(spy).not.toHaveBeenCalled();

    logger.setLevel('error');
    logger.warn('hidden-warn');
    expect(spy).not.toHaveBeenCalled();

    logger.error('visible-error');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('creates scoped logger that logs with scope', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const scoped = createScopedLogger('UnitScope');

    logger.setLevel('trace');
    scoped.info('hello');

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
