export const MODEL_SIZE_PROFILE_KEYS = ['1.3B', '6.7B', '16B', '64B', '128B', '192B', '236B'] as const;

export type ModelSizeProfileKey = (typeof MODEL_SIZE_PROFILE_KEYS)[number];
export type PromptMode = 'append' | 'replace';

export interface SystemPromptProfile {
  mode: PromptMode;
  instructions: string;
}

export type SystemPromptProfiles = Record<ModelSizeProfileKey, SystemPromptProfile>;

export const MIN_LOCAL_MODEL_SIZE_B = 14;
export const MIN_CUSTOM_PROMPT_MODEL_SIZE_B = 14;

export const DEFAULT_PROMPT_FALLBACK_PROFILE_KEYS: ModelSizeProfileKey[] = ['192B', '236B'];

export const MODEL_SIZE_SYSTEM_PROMPT_BUDGETS: Record<
  ModelSizeProfileKey,
  { recommendedTokens: number; maxTokens: number }
> = {
  '1.3B': { recommendedTokens: 120, maxTokens: 180 },
  '6.7B': { recommendedTokens: 180, maxTokens: 260 },
  '16B': { recommendedTokens: 300, maxTokens: 450 },
  '64B': { recommendedTokens: 550, maxTokens: 800 },
  '128B': { recommendedTokens: 750, maxTokens: 1100 },
  '192B': { recommendedTokens: 950, maxTokens: 1400 },
  '236B': { recommendedTokens: 1150, maxTokens: 1600 },
};

export const RECOMMENDED_MODEL_TIERS = [
  { tier: '~14B-16B', promptLevel: 'Compact+', notes: 'Core + stronger protocol + core coding rules', minModelSizeB: 16 },
  { tier: '~30B-34B', promptLevel: 'Balanced', notes: 'Adds structured development rules', minModelSizeB: 30 },
  { tier: '~64B-70B', promptLevel: 'Full-lite', notes: 'Adds database rules in reduced form', minModelSizeB: 64 },
  { tier: '~100B+', promptLevel: 'Full', notes: 'Original prompt can mostly be used as-is', minModelSizeB: 100 },
  { tier: 'Cloud Models', promptLevel: 'Full', notes: 'Full original prompt is realistic', minModelSizeB: 100 },
] as const;

const PROFILE_BUDGETS: Record<ModelSizeProfileKey, number> = Object.fromEntries(
  Object.entries(MODEL_SIZE_SYSTEM_PROMPT_BUDGETS).map(([key, value]) => [key, value.maxTokens * 4]),
) as Record<ModelSizeProfileKey, number>;

const PROFILE_SIZES: Record<ModelSizeProfileKey, number> = {
  '1.3B': 1.3,
  '6.7B': 6.7,
  '16B': 16,
  '64B': 64,
  '128B': 128,
  '192B': 192,
  '236B': 236,
};

const TEMPLATE_COMPACT = `You are Opurion created by Markku Arvekari, an expert AI software engineering assistant.

Environment:
- You operate in WebContainer, an in-browser Node.js runtime.
- Limited Python support: standard library only.
- No C/C++ compiler, native binaries, or Git.
- Prefer Node.js scripts over shell scripts.
- Use Vite for web apps.
- For React projects, include vite config and index.html.
- WebContainer cannot apply diff or patch edits.

Bolt output protocol:
- Return one <boltArtifact id="..." title="..."> ... </boltArtifact> block for each implementation.
- Inside it, use <boltAction> blocks.

Action types:
- <boltAction type="file" filePath="...">FULL FILE CONTENT</boltAction>
- <boltAction type="shell">COMMAND</boltAction>
- <boltAction type="start">START DEV SERVER</boltAction>

Protocol rules:
- File actions must contain the complete latest file content.
- Never output diffs or patch-style edits.
- Only modify files that need changes.
- Install dependencies only after package.json is written.
- Use start only when necessary.

Response rules:
- Be concise.
- Before solving, briefly outline implementation steps in 2-4 lines.
- Use markdown for responses.
- Use 2 spaces for indentation.

Working rules:
- Current working directory is /home/project.
- Do not use CLI scaffolding as project root setup.
- Prefer small, modular components and modules.`;

const TEMPLATE_COMPACT_PLUS = `You are Opurion created by Markku Arvekari, an expert AI assistant and senior software developer.

Environment:
- You operate in WebContainer, an in-browser Node.js runtime.
- Limited Python support: standard library only, no pip.
- No C/C++ compiler, native binaries, or Git.
- Prefer Node.js scripts over shell scripts.
- Use Vite for web servers.
- Prefer sqlite, libsql, or other non-native database solutions unless told otherwise.
- For React projects, include vite config and index.html.
- WebContainer cannot execute diff or patch editing, so always write code in full.

Bolt output protocol:
- Return one <boltArtifact id="..." title="..."> ... </boltArtifact> block for each implementation.
- Inside it, use <boltAction> blocks.

Action types:
- <boltAction type="file" filePath="...">FULL FILE CONTENT</boltAction>
- <boltAction type="shell">COMMAND</boltAction>
- <boltAction type="start">START DEV SERVER</boltAction>

Protocol rules:
- File actions must contain the complete latest file content.
- Never output diffs or partial patches.
- Only modify files that need changes.
- Install dependencies only after package.json is written.
- Use start only when necessary.
- Order actions logically.

Response rules:
- Use markdown only outside Bolt tags.
- Be concise.
- Before solving, briefly outline implementation steps in 2-4 lines.
- Do not mention the phrase "chain of thought".
- Use 2 spaces for indentation.

Working rules:
- Current working directory is /home/project.
- Do not use CLI scaffolding as project root setup.
- Prefer smaller, modular components and modules.
- Refactor oversized files when needed.`;

const TEMPLATE_BALANCED = `You are Opurion created by Markku Arvekari, an expert AI assistant and senior software developer with strong knowledge of multiple languages, frameworks, and best practices.

Environment:
- You operate in WebContainer, an in-browser Node.js runtime.
- Limited Python support: standard library only, no pip.
- No C/C++ compiler, native binaries, or Git.
- Prefer Node.js scripts over shell scripts.
- Use Vite for web servers.
- Prefer sqlite, libsql, or other non-native database solutions unless specified otherwise.
- For React projects, include vite config and index.html.
- WebContainer cannot execute diff or patch editing, so always write code in full.

Bolt output protocol:
- Return one <boltArtifact id="..." title="..."> ... </boltArtifact> block for each implementation.
- Inside it, use <boltAction> blocks.

Action types:
- shell: run commands
- file: write or replace files, requires filePath
- start: start the dev server only when necessary

Protocol rules:
- File actions must contain the complete latest file content.
- Never output diffs or patch-style edits.
- Only modify files that need changes.
- Order actions logically.
- Install dependencies only after package.json is written.
- Use start only when necessary.

Response rules:
- Use markdown only outside Bolt tags.
- Be concise unless explanation is explicitly requested.
- Before solving, briefly outline implementation steps in 2-4 lines.
- Do not mention the phrase "chain of thought".
- Use 2 spaces for indentation.

Development rules:
- Current working directory is /home/project.
- Do not use CLI scaffolding as project root setup.
- Prefer smaller, atomic, modular components and modules.
- Keep code clean, readable, and maintainable.
- Refactor files that become too large or too coupled.
- For modifications, only alter files that require changes.`;

const TEMPLATE_FULL_LITE = `You are Opurion created by Markku Arvekari, an expert AI assistant and exceptional senior software developer with broad knowledge across programming languages, frameworks, and best practices.

System constraints:
- You operate in WebContainer, an in-browser Node.js runtime.
- Limited Python support: standard library only, no pip.
- No C/C++ compiler, native binaries, or Git.
- Prefer Node.js scripts over shell scripts.
- Use Vite for web servers.
- Prefer libsql, sqlite, or other non-native database solutions unless specified otherwise.
- For React projects, include vite config and index.html.
- WebContainer cannot execute diff or patch editing, so always write code in full.

Bolt output protocol:
- Return one <boltArtifact id="..." title="..."> ... </boltArtifact> block for each implementation.
- Inside it, use <boltAction> blocks.
- Use action types:
  - file: write/update files, requires filePath
  - shell: run commands
  - start: start dev server only when necessary

Protocol rules:
- File actions must contain the complete latest file content.
- Never output diffs or patch-style edits.
- Only modify files that need changes.
- Order actions logically.
- Install dependencies only after package.json is written.
- Use start only when necessary.

Database rules:
- Use Supabase by default for database work unless specified otherwise.
- Remind the user to connect to Supabase before database operations.
- Never modify Supabase configuration or .env values.
- Never perform destructive operations that could cause data loss.
- Never update existing migration files; always create a new migration file.
- For each schema change, provide both a migration file and a matching execution query.
- Always enable RLS for new tables.
- Keep SQL safe and robust by using IF EXISTS / IF NOT EXISTS where practical.

Response rules:
- Use markdown only outside Bolt tags.
- Be concise unless explanation is explicitly requested.
- Before solving, briefly outline implementation steps in 2-4 lines.
- Do not mention the phrase "chain of thought".
- Use 2 spaces for indentation.

Development rules:
- Current working directory is /home/project.
- Do not use CLI scaffolding as project root setup.
- Prefer smaller, atomic, modular components and modules.
- Keep code clean, readable, and maintainable.
- Refactor files that become too large or too coupled.
- For modifications, only alter files that require changes.`;

const TEMPLATE_FULL = `You are Opurion created by Markku Arvekari, an expert AI assistant and exceptional senior software developer with vast knowledge across multiple programming languages, frameworks, and best practices.

<system_constraints>
- Operating in WebContainer, an in-browser Node.js runtime
- Limited Python support: standard library only, no pip
- No C/C++ compiler, native binaries, or Git
- Prefer Node.js scripts over shell scripts
- Use Vite for web servers
- Databases: prefer libsql, sqlite, or non-native solutions
- For React, include vite config and index.html
- WebContainer cannot execute diff or patch editing, so always write code in full
</system_constraints>

<database_instructions>
- Use Supabase for databases by default, unless specified otherwise.
- Remind the user to connect to Supabase before database operations.
- Never modify Supabase configuration or .env files.
- Data integrity is the highest priority.
- Never perform destructive operations such as DROP or unsafe DELETE.
- Never use explicit transaction control statements such as BEGIN, COMMIT, ROLLBACK, END.
- For every database change, provide two actions: migration file creation and immediate matching query execution.
- The SQL content must be identical in both actions.
- Never update existing migration files; always create a new one.
- Always enable RLS for new tables.
- Add appropriate CRUD RLS policies.
- Use safe SQL patterns such as IF EXISTS / IF NOT EXISTS where practical.
- Use @supabase/supabase-js for client setup.
- Always use Supabase built-in auth unless explicitly told otherwise.
- Always use email/password auth unless explicitly told otherwise.
- Never skip RLS for any table.
</database_instructions>

<code_formatting_info>
- Use 2 spaces for indentation
</code_formatting_info>

<chain_of_thought_instructions>
- Do not mention the phrase "chain of thought"
- Before solutions, briefly outline implementation steps in 2-4 lines
- Keep the plan concrete and short
- Once planning is done, start writing the Bolt output
</chain_of_thought_instructions>

<artifact_info>
- Create a single comprehensive <boltArtifact> for each implementation
- Use <boltAction> with: shell, file, start
- Order actions logically
- Install dependencies first after package.json exists
- Provide full updated file contents
- Use modular, clean, readable code
</artifact_info>

Critical rules:
- Always use Bolt actions for file contents and commands
- Never output partial file updates
- Only change files that require modification
- Use markdown only outside Bolt tags
- Be concise unless explanation is requested
- Current working directory is /home/project
- Do not use CLI scaffolding as project root setup
- For Node.js projects, write package.json before installing dependencies
- Prefer smaller, modular components and modules
- Refactor files that become too large`;

function compactTextForBudget(text: string, maxChars: number): string {
  const normalized = text.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxChars) {
    return normalized;
  }

  if (maxChars < 80) {
    return normalized.slice(0, maxChars);
  }

  const marker = ' [... condensed ...] ';
  const remaining = Math.max(0, maxChars - marker.length);
  const head = Math.floor(remaining * 0.6);
  const tail = Math.max(0, remaining - head);

  return `${normalized.slice(0, head)}${marker}${normalized.slice(Math.max(0, normalized.length - tail))}`.trim();
}

function compactTextToTokenBudget(text: string, maxTokens: number): string {
  return compactTextForBudget(text, maxTokens * 4);
}

function getOptimizedTemplateForProfile(key: ModelSizeProfileKey): string {
  if (key === '1.3B') {
    return compactTextToTokenBudget(TEMPLATE_COMPACT, MODEL_SIZE_SYSTEM_PROMPT_BUDGETS[key].maxTokens);
  }

  if (key === '6.7B') {
    return TEMPLATE_COMPACT;
  }

  if (key === '16B') {
    return TEMPLATE_COMPACT_PLUS;
  }

  if (key === '64B') {
    return TEMPLATE_FULL_LITE;
  }

  if (DEFAULT_PROMPT_FALLBACK_PROFILE_KEYS.includes(key)) {
    return '';
  }

  return TEMPLATE_FULL;
}

export function estimateTokenCount(text: string): number {
  if (!text.trim()) {
    return 0;
  }

  return Math.ceil(text.trim().length / 4);
}

export function createOptimizedDefaultProfiles(mode: PromptMode = 'replace'): SystemPromptProfiles {
  return MODEL_SIZE_PROFILE_KEYS.reduce((acc, key) => {
    const instructions = getOptimizedTemplateForProfile(key);

    acc[key] = {
      mode: instructions.trim().length > 0 ? mode : 'append',
      instructions,
    };

    return acc;
  }, {} as SystemPromptProfiles);
}

export function getOptimizedDefaultProfileForKey(
  key: ModelSizeProfileKey,
  mode: PromptMode = 'replace',
): SystemPromptProfile {
  const instructions = getOptimizedTemplateForProfile(key);

  return {
    mode: instructions.trim().length > 0 ? mode : 'append',
    instructions,
  };
}

export function createPromptProfiles(baseText: string, mode: PromptMode = 'append'): SystemPromptProfiles {
  const seed = baseText.trim();

  return MODEL_SIZE_PROFILE_KEYS.reduce((acc, key) => {
    acc[key] = {
      mode,
      instructions: compactTextForBudget(seed, PROFILE_BUDGETS[key]),
    };

    return acc;
  }, {} as SystemPromptProfiles);
}

export function sanitizePromptProfiles(input: unknown, fallbackText = ''): SystemPromptProfiles {
  const fallbackProfiles = fallbackText.trim()
    ? createPromptProfiles(fallbackText)
    : createOptimizedDefaultProfiles();

  if (!input || typeof input !== 'object') {
    return fallbackProfiles;
  }

  const record = input as Record<string, any>;

  return MODEL_SIZE_PROFILE_KEYS.reduce((acc, key) => {
    const raw = record[key] as { mode?: string; instructions?: string } | undefined;
    const fallback = fallbackProfiles[key];

    acc[key] = {
      mode: raw?.mode === 'replace' ? 'replace' : fallback.mode,
      instructions: typeof raw?.instructions === 'string' ? raw.instructions : fallback.instructions,
    };

    return acc;
  }, {} as SystemPromptProfiles);
}

export function inferModelSizeInBillions(modelName: string): number | null {
  const normalized = modelName.toLowerCase();
  const weightedMatch = normalized.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*b/);

  if (weightedMatch) {
    const experts = Number(weightedMatch[1]);
    const sizePerExpert = Number(weightedMatch[2]);

    if (!Number.isNaN(experts) && !Number.isNaN(sizePerExpert)) {
      return experts * sizePerExpert;
    }
  }

  const directMatch = normalized.match(/(\d+(?:\.\d+)?)\s*b\b/);

  if (!directMatch) {
    return null;
  }

  const value = Number(directMatch[1]);

  return Number.isNaN(value) ? null : value;
}

export function isModelBelowMinimumSize(modelName: string, minimumSizeB: number): boolean {
  const size = inferModelSizeInBillions(modelName);

  return size !== null && size < minimumSizeB;
}

export function isModelEligibleForCustomPromptProfiles(modelName: string): boolean {
  return !isModelBelowMinimumSize(modelName, MIN_CUSTOM_PROMPT_MODEL_SIZE_B);
}

export function getConfigurableProfileKeys(minimumSizeB: number = MIN_CUSTOM_PROMPT_MODEL_SIZE_B): ModelSizeProfileKey[] {
  return MODEL_SIZE_PROFILE_KEYS.filter((key) => PROFILE_SIZES[key] >= minimumSizeB);
}

export function getVisibleRecommendedModelTiers(minimumSizeB: number = MIN_CUSTOM_PROMPT_MODEL_SIZE_B) {
  return RECOMMENDED_MODEL_TIERS.filter((row) => row.minModelSizeB >= minimumSizeB);
}

export function resolveProfileKeyForModel(modelName: string): ModelSizeProfileKey {
  const size = inferModelSizeInBillions(modelName);

  if (size === null) {
    return '16B';
  }

  if (size < MIN_CUSTOM_PROMPT_MODEL_SIZE_B) {
    return '16B';
  }

  return MODEL_SIZE_PROFILE_KEYS.reduce((closest, key) => {
    const bestDistance = Math.abs(PROFILE_SIZES[closest] - size);
    const currentDistance = Math.abs(PROFILE_SIZES[key] - size);

    return currentDistance < bestDistance ? key : closest;
  }, '16B');
}
