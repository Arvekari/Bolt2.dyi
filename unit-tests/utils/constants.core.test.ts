import { describe, expect, it } from 'vitest';
import { MODIFICATIONS_TAG_NAME, WORK_DIR, WORK_DIR_NAME } from '~/utils/constants';

describe('constants core', () => {
  it('exports workdir constants', () => {
    expect(WORK_DIR_NAME).toBe('project');
    expect(WORK_DIR).toContain('/home/project');
    expect(MODIFICATIONS_TAG_NAME).toBe('bolt_file_modifications');
  });
});
