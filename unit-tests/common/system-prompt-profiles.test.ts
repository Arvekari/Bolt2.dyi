import { describe, expect, it } from 'vitest';
import {
  createOptimizedDefaultProfiles,
  createPromptProfiles,
  estimateTokenCount,
  MODEL_SIZE_PROFILE_KEYS,
  MODEL_SIZE_SYSTEM_PROMPT_BUDGETS,
  isModelEligibleForCustomPromptProfiles,
  resolveProfileKeyForModel,
  sanitizePromptProfiles,
} from '~/lib/common/system-prompt-profiles';

describe('system prompt profiles', () => {
  it('builds all configured size profiles', () => {
    const profiles = createPromptProfiles('Always follow project rules.');

    expect(Object.keys(profiles)).toEqual(MODEL_SIZE_PROFILE_KEYS);
    expect(profiles['1.3B'].instructions.length).toBeLessThanOrEqual(profiles['236B'].instructions.length);
  });

  it('resolves nearest profile key from model name', () => {
    expect(resolveProfileKeyForModel('deepseek-coder:6.7b')).toBe('16B');
    expect(resolveProfileKeyForModel('llama-3.1-8b')).toBe('16B');
    expect(resolveProfileKeyForModel('qwen-3-235b-a22b')).toBe('236B');
  });

  it('marks models below 14B as ineligible for custom prompt profiles', () => {
    expect(isModelEligibleForCustomPromptProfiles('deepseek-coder:6.7b')).toBe(false);
    expect(isModelEligibleForCustomPromptProfiles('llama-3.1-8b')).toBe(false);
    expect(isModelEligibleForCustomPromptProfiles('qwen2.5-coder:14b')).toBe(true);
    expect(isModelEligibleForCustomPromptProfiles('qwen2.5-coder:32b')).toBe(true);
    expect(isModelEligibleForCustomPromptProfiles('qwen-3-235b-a22b')).toBe(true);
  });

  it('sanitizes unknown profile payloads with defaults', () => {
    const profiles = sanitizePromptProfiles({ foo: { mode: 'replace', instructions: 'x' } }, 'base instruction');

    expect(profiles['16B'].instructions.length).toBeGreaterThan(0);
    expect(profiles['16B'].mode).toBe('append');
  });

  it('returns optimized template defaults when no fallback text exists', () => {
    const profiles = sanitizePromptProfiles(undefined, '');

    expect(profiles['6.7B'].mode).toBe('replace');
    expect(profiles['6.7B'].instructions).toContain('You are Opurion created by Markku Arvekari');
    expect(profiles['64B'].instructions).toContain('Database rules');
    expect(profiles['128B'].instructions).toContain('<system_constraints>');
    expect(profiles['192B'].instructions).toBe('');
    expect(profiles['236B'].instructions).toBe('');
    expect(profiles['128B'].mode).toBe('replace');
  });

  it('builds optimized default profiles for all configured buckets', () => {
    const profiles = createOptimizedDefaultProfiles();

    expect(Object.keys(profiles)).toEqual(MODEL_SIZE_PROFILE_KEYS);
    expect(estimateTokenCount(profiles['1.3B'].instructions)).toBeLessThanOrEqual(
      MODEL_SIZE_SYSTEM_PROMPT_BUDGETS['1.3B'].maxTokens,
    );
  });

  it('estimates prompt tokens from character length', () => {
    expect(estimateTokenCount('')).toBe(0);
    expect(estimateTokenCount('1234')).toBe(1);
    expect(estimateTokenCount('12345')).toBe(2);
  });
});
