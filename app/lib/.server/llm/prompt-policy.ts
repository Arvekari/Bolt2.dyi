type PromptMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

import { inferModelSizeInBillions } from '~/lib/common/system-prompt-profiles';

export type ModelClass = 'small' | 'standard' | 'large';

export type PromptProfile = {
  modelClass: ModelClass;
  maxContextChars: number;
  maxInstructionChars: number;
};

const COMPACTED_GAP_MARKER = '\n\n[... condensed ...]\n\n';

const PROFILES: Record<ModelClass, PromptProfile> = {
  small: {
    modelClass: 'small',
    maxContextChars: 5000,
    maxInstructionChars: 1200,
  },
  standard: {
    modelClass: 'standard',
    maxContextChars: 12000,
    maxInstructionChars: 3000,
  },
  large: {
    modelClass: 'large',
    maxContextChars: 24000,
    maxInstructionChars: 6000,
  },
};

export function detectModelClass(modelName: string, modelMeta?: { maxTokenAllowed?: number }): ModelClass {
  const normalizedName = modelName.toLowerCase();
  const inferredSizeB = inferModelSizeInBillions(modelName);

  // Prefer explicit parameter-size hints over context-window heuristics for local models.
  // Many 14B-16B Ollama models expose 8k contexts, but still need more than the
  // ultra-compact prompt profile used for truly small models.
  if (inferredSizeB !== null && inferredSizeB >= 14) {
    return inferredSizeB >= 100 ? 'large' : 'standard';
  }

  if (
    normalizedName.includes('mini') ||
    normalizedName.includes('small') ||
    normalizedName.includes('8b') ||
    (modelMeta?.maxTokenAllowed !== undefined && modelMeta.maxTokenAllowed <= 8192)
  ) {
    return 'small';
  }

  if (modelMeta?.maxTokenAllowed !== undefined && modelMeta.maxTokenAllowed > 65536) {
    return 'large';
  }

  return 'standard';
}

export function compactInstructions(input: string): string {
  return input
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line, index, list) => !(line.length === 0 && list[index - 1]?.length === 0))
    .join('\n')
    .trim();
}

export function compactSystemInstructions(input: string, maxChars: number): string {
  const compacted = compactInstructions(input);

  if (compacted.length <= maxChars) {
    return compacted;
  }

  if (maxChars <= COMPACTED_GAP_MARKER.length + 80) {
    return compacted.slice(0, maxChars).trim();
  }

  const remainingBudget = maxChars - COMPACTED_GAP_MARKER.length;
  const suffixBudget = Math.max(Math.floor(remainingBudget * 0.45), 200);
  const prefixBudget = Math.max(remainingBudget - suffixBudget, 200);
  const prefix = compacted.slice(0, prefixBudget).trimEnd();
  const suffix = compacted.slice(-suffixBudget).trimStart();

  return `${prefix}${COMPACTED_GAP_MARKER}${suffix}`;
}

function pruneMessages(messages: PromptMessage[], maxChars: number): { messages: PromptMessage[]; wasPruned: boolean } {
  const kept: PromptMessage[] = [];
  let total = 0;

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    const size = message.content.length;

    if (total + size > maxChars && kept.length > 0) {
      continue;
    }

    kept.unshift(message);
    total += size;

    if (total >= maxChars) {
      break;
    }
  }

  const wasPruned = kept.length < messages.length;

  return { messages: kept, wasPruned };
}

export function applyPromptPolicy(input: {
  system: string;
  messages: PromptMessage[];
  modelName: string;
  modelMeta?: { maxTokenAllowed?: number };
}) {
  const modelClass = detectModelClass(input.modelName, input.modelMeta);
  const profile = PROFILES[modelClass];

  const compactSystem = compactSystemInstructions(input.system, profile.maxInstructionChars);
  const compactMessages = input.messages.map((message) => ({
    ...message,
    content: compactInstructions(message.content),
  }));

  const pruned = pruneMessages(compactMessages, profile.maxContextChars);

  return {
    system: compactSystem,
    messages: pruned.messages,
    profile,
    diagnostics: {
      wasPruned: pruned.wasPruned,
      selectedProfile: modelClass,
    },
  };
}
