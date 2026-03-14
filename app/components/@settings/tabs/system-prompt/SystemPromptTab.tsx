import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import { useSettings } from '~/lib/hooks/useSettings';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { useStore } from '@nanostores/react';
import { availableModelsStore, selectedModelStore } from '~/lib/stores/model';
import {
  createOptimizedDefaultProfiles,
  getOptimizedDefaultProfileForKey,
  MODEL_SIZE_PROFILE_KEYS,
  getConfigurableProfileKeys,
  getVisibleRecommendedModelTiers,
  MIN_CUSTOM_PROMPT_MODEL_SIZE_B,
  MODEL_SIZE_SYSTEM_PROMPT_BUDGETS,
  estimateTokenCount,
} from '~/lib/common/system-prompt-profiles';

export default function SystemPromptTab() {
  const {
    promptId,
    setPromptId,
    promptLibraryOverrides,
    setPromptLibraryOverride,
    removePromptLibraryOverride,
    resetPromptLibraryOverrides,
    customPromptEnabled,
    setCustomPromptEnabled,
    customPromptProfiles,
    updateCustomPromptProfile,
    resetCustomPromptProfiles,
    customPromptProfileKey,
    setCustomPromptProfileKey,
    activeModelProfileKey,
  } = useSettings();
  const selectedModel = useStore(selectedModelStore);
  const availableModels = useStore(availableModelsStore);
  const [isEditorReadOnly, setIsEditorReadOnly] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const visibleProfileKeys = useMemo(
    () => getConfigurableProfileKeys(MIN_CUSTOM_PROMPT_MODEL_SIZE_B),
    [],
  );
  const visibleRecommendedTiers = useMemo(
    () => getVisibleRecommendedModelTiers(MIN_CUSTOM_PROMPT_MODEL_SIZE_B),
    [],
  );
  const hiddenProfileKeys = useMemo(
    () => MODEL_SIZE_PROFILE_KEYS.filter((key) => !visibleProfileKeys.includes(key)),
    [visibleProfileKeys],
  );

  const selectedModelInfo = useMemo(
    () => availableModels.find((model) => model.name === selectedModel),
    [availableModels, selectedModel],
  );

  const editorProfileKey = useMemo(() => {
    const candidate = customPromptEnabled ? activeModelProfileKey : customPromptProfileKey;

    if (visibleProfileKeys.includes(candidate)) {
      return candidate;
    }

    return '16B';
  }, [activeModelProfileKey, customPromptEnabled, customPromptProfileKey, visibleProfileKeys]);
  const editorProfile = customPromptProfiles[editorProfileKey];

  const getCurrentBasePrompt = useCallback(() => {
    return (
      PromptLibrary.getPropmtFromLibrary(promptId || 'default', {
        cwd: '/home/project',
        allowedHtmlElements: [],
        modificationTagName: 'bolt_file_modifications',
        supabase: {
          isConnected: false,
          hasSelectedProject: false,
          credentials: undefined,
        },
      }) || ''
    );
  }, [promptId]);

  const basePrompt = getCurrentBasePrompt();
  const currentPromptLibraryText = promptLibraryOverrides[promptId] ?? basePrompt;
  const hasSeededProfiles = useMemo(
    () => visibleProfileKeys.some((key) => (customPromptProfiles[key]?.instructions || '').trim().length > 0),
    [customPromptProfiles, visibleProfileKeys],
  );
  const activeProfile = customPromptProfiles[activeModelProfileKey];
  const usedTokens = estimateTokenCount(
    (activeProfile?.mode === 'replace' ? activeProfile.instructions : `${basePrompt}\n${activeProfile?.instructions || ''}`).trim(),
  );
  const maxTokens = selectedModelInfo?.maxTokenAllowed || 0;
  const tokensLeft = maxTokens > 0 ? Math.max(0, maxTokens - usedTokens) : 0;

  const downloadJson = useCallback((filename: string, payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const applyImportedProfiles = useCallback(
    (
      importedProfiles: Record<string, { instructions?: string; mode?: string }>,
      importedEnabled?: boolean,
      importedSelectedProfileKey?: string,
    ) => {
      visibleProfileKeys.forEach((key) => {
        const incoming = importedProfiles[key] || {};
        const current = customPromptProfiles[key];

        updateCustomPromptProfile(key, {
          mode: incoming.mode === 'replace' ? 'replace' : current.mode,
          instructions: typeof incoming.instructions === 'string' ? incoming.instructions : current.instructions,
        });
      });

      hiddenProfileKeys.forEach((key) => {
        updateCustomPromptProfile(key, getOptimizedDefaultProfileForKey(key));
      });

      if (typeof importedEnabled === 'boolean') {
        setCustomPromptEnabled(importedEnabled);
      }

      if (importedSelectedProfileKey && visibleProfileKeys.includes(importedSelectedProfileKey as any)) {
        setCustomPromptProfileKey(importedSelectedProfileKey as any);
      }
    },
    [
      customPromptProfiles,
      hiddenProfileKeys,
      setCustomPromptEnabled,
      setCustomPromptProfileKey,
      updateCustomPromptProfile,
      visibleProfileKeys,
    ],
  );

  const handleExportProfiles = useCallback(() => {
    const defaults = createOptimizedDefaultProfiles();
    const filteredDefaults = visibleProfileKeys.reduce((acc, key) => {
      acc[key] = defaults[key];
      return acc;
    }, {} as Record<string, { mode: 'append' | 'replace'; instructions: string }>);
    const filteredProfiles = visibleProfileKeys.reduce((acc, key) => {
      acc[key] = customPromptProfiles[key];
      return acc;
    }, {} as Record<string, { mode: 'append' | 'replace'; instructions: string }>);
    const payload = {
      schema: 'Opurion-system-prompt-profiles',
      version: 2,
      minimumModelSizeB: MIN_CUSTOM_PROMPT_MODEL_SIZE_B,
      exportedAt: new Date().toISOString(),
      defaults: filteredDefaults,
      custom: {
        enabled: customPromptEnabled,
        selectedProfileKey: visibleProfileKeys.includes(customPromptProfileKey) ? customPromptProfileKey : '16B',
        profiles: filteredProfiles,
      },
    };

    downloadJson('Opurion-system-prompt-profiles.json', payload);
    toast.success('Exported system prompt profiles JSON');
  }, [customPromptEnabled, customPromptProfileKey, customPromptProfiles, downloadJson, visibleProfileKeys]);

  const handleDownloadEmptyTemplate = useCallback(() => {
    const emptyProfiles = visibleProfileKeys.reduce((acc, key) => {
      acc[key] = { mode: 'append', instructions: '' };
      return acc;
    }, {} as Record<string, { mode: 'append'; instructions: string }>);

    downloadJson('Opurion-system-prompt-profiles.template.json', {
      schema: 'Opurion-system-prompt-profiles',
      version: 2,
      minimumModelSizeB: MIN_CUSTOM_PROMPT_MODEL_SIZE_B,
      custom: {
        enabled: false,
        selectedProfileKey: '16B',
        profiles: emptyProfiles,
      },
    });
    toast.success('Downloaded empty profile JSON template');
  }, [downloadJson, visibleProfileKeys]);

  const handleImportProfiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      try {
        const raw = await file.text();
        const parsed = JSON.parse(raw) as Record<string, any>;

        const importedCustom = (parsed.custom || {}) as Record<string, any>;
        const importedProfiles = (importedCustom.profiles || parsed.profiles) as Record<
          string,
          { instructions?: string; mode?: string }
        >;

        if (!importedProfiles || typeof importedProfiles !== 'object') {
          throw new Error('Invalid JSON: missing custom.profiles');
        }

        applyImportedProfiles(importedProfiles, importedCustom.enabled, importedCustom.selectedProfileKey);
        toast.success('Imported system prompt profiles JSON');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to import JSON');
      } finally {
        event.target.value = '';
      }
    },
    [applyImportedProfiles],
  );

  useEffect(() => {
    if (!visibleProfileKeys.includes(customPromptProfileKey)) {
      setCustomPromptProfileKey('16B');
    }
  }, [customPromptProfileKey, setCustomPromptProfileKey, visibleProfileKeys]);

  useEffect(() => {
    if (hasSeededProfiles) {
      return;
    }

    const base = getCurrentBasePrompt().trim();

    if (!base) {
      return;
    }

    resetCustomPromptProfiles(base);
  }, [hasSeededProfiles, getCurrentBasePrompt, resetCustomPromptProfiles]);

  return (
    <div className="space-y-6">
      {/* Prompt Library */}
      <div className="rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-bolt-elements-textPrimary">Prompt Library</h3>
            <p className="mt-1 text-xs text-bolt-elements-textSecondary">
              Choose a base system prompt from the built-in prompt library.
            </p>
          </div>
          <select
            value={promptId}
            onChange={(e) => {
              setPromptId(e.target.value);
              toast.success('Prompt template updated');
            }}
            className={classNames(
              'rounded-lg border border-bolt-elements-borderColor px-3 py-2 text-sm min-w-[200px]',
              'bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
            )}
          >
            {PromptLibrary.getList().map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <textarea
            value={currentPromptLibraryText}
            onChange={(event) => {
              setPromptLibraryOverride(promptId, event.target.value);
            }}
            rows={8}
            className={classNames(
              'w-full rounded-lg border border-bolt-elements-borderColor p-3 text-sm',
              'bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'resize-y',
            )}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                removePromptLibraryOverride(promptId);
                toast.success(`Restored ${promptId} to default prompt library text`);
              }}
              className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-500/20"
            >
              Restore Selected Prompt Default
            </button>
            <button
              type="button"
              onClick={() => {
                resetPromptLibraryOverrides();
                toast.success('Restored prompt library defaults');
              }}
              className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-500/20"
            >
              Restore Prompt Library Defaults
            </button>
          </div>
          <p className="mt-2 text-xs text-bolt-elements-textSecondary">
            Edits here override the selected prompt library template and are used as the base prompt at runtime.
          </p>
        </div>
      </div>

      {/* Custom System Prompt */}
      <div className="rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-bolt-elements-textPrimary">Custom System Prompt</h3>
            <p className="mt-1 text-xs text-bolt-elements-textSecondary">
              Manage model-size-specific custom prompts with append/replace behavior.
            </p>
            <p className="mt-1 text-xs text-bolt-elements-textSecondary">
              When this switch is ON, the app automatically uses the profile matching the active model size.
            </p>
          </div>
          <Switch
            checked={customPromptEnabled}
            onCheckedChange={(checked) => {
              setCustomPromptEnabled(checked);
              toast.success(`Custom prompt ${checked ? 'enabled' : 'disabled'}`);
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowHelp((prev) => !prev)}
            className="h-6 w-6 rounded-full border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 text-xs font-semibold text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-4"
            title="Show help for system prompt profiles"
            aria-label="Show help for system prompt profiles"
          >
            ?
          </button>
        </div>

        {showHelp && (
          <div className="mt-3 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-3 p-3 text-xs text-bolt-elements-textSecondary">
            <p className="mb-2 text-bolt-elements-textPrimary">How to use these settings</p>
            <p className="mb-2">
              Use <strong>Load</strong> to preview a model-size prompt in read-only mode. Use <strong>Edit</strong> when you want to change that prompt text.
              <strong> Append</strong> adds your custom text after the base system prompt, while <strong>Replace</strong> fully overrides the base prompt.
            </p>
            <p className="mb-2">
              The <strong>Custom System Prompt</strong> ON/OFF switch also controls automatic profile routing: when ON, the matching model-size profile is applied automatically.
            </p>
            <p className="mb-2">
              For cloud providers and model sizes <strong>100B+</strong>, custom profile text defaults to empty so the built-in full system prompt is used automatically.
              If a custom profile is empty, default prompt behavior is used.
            </p>
            <p className="mb-2">
              <strong>Regenerate Profiles</strong> rebuilds all size profiles from the current selected base prompt template. Use this if you changed Prompt Library template and want aligned defaults.
            </p>
            <p>
              <strong>Load Base Into Selected</strong> copies the current base prompt into just the currently selected profile as <strong>Replace</strong>. Use this when one profile needs a full baseline reset.
            </p>

            <div className="mt-4 overflow-x-auto rounded-lg border border-bolt-elements-borderColor">
              <table className="w-full text-xs">
                <thead className="bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary">
                  <tr>
                    <th className="px-3 py-2 text-left">Model Size</th>
                    <th className="px-3 py-2 text-left">Recommended System Prompt Budget</th>
                    <th className="px-3 py-2 text-left">Max System Prompt Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProfileKeys.map((size) => (
                    <tr key={size} className="border-t border-bolt-elements-borderColor">
                      <td className="px-3 py-2 text-bolt-elements-textPrimary">{size}</td>
                      <td className="px-3 py-2">{MODEL_SIZE_SYSTEM_PROMPT_BUDGETS[size].recommendedTokens}</td>
                      <td className="px-3 py-2">{MODEL_SIZE_SYSTEM_PROMPT_BUDGETS[size].maxTokens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-bolt-elements-borderColor">
              <table className="w-full text-xs">
                <thead className="bg-bolt-elements-background-depth-2 text-bolt-elements-textPrimary">
                  <tr>
                    <th className="px-3 py-2 text-left">Model Tier</th>
                    <th className="px-3 py-2 text-left">Prompt Level</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecommendedTiers.map((row) => (
                    <tr key={row.tier} className="border-t border-bolt-elements-borderColor">
                      <td className="px-3 py-2 text-bolt-elements-textPrimary">{row.tier}</td>
                      <td className="px-3 py-2">{row.promptLevel}</td>
                      <td className="px-3 py-2">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportProfiles}
            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-500/20"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => importFileInputRef.current?.click()}
            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-500/20"
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={handleDownloadEmptyTemplate}
            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-500/20"
          >
            Download Empty Template
          </button>
          <button
            type="button"
            onClick={() => {
              const defaults = createOptimizedDefaultProfiles();

              visibleProfileKeys.forEach((key) => {
                updateCustomPromptProfile(key, defaults[key]);
              });

              toast.success('Restored all profile defaults');
            }}
            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-500/20"
          >
            Restore All Defaults
          </button>
          <input
            ref={importFileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportProfiles}
          />
          <button
            type="button"
            onClick={() => {
              updateCustomPromptProfile(editorProfileKey, getOptimizedDefaultProfileForKey(editorProfileKey));
              setIsEditorReadOnly(true);
              toast.success(`Restored default for ${editorProfileKey}`);
            }}
            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-500/20"
          >
            Restore Selected Default
          </button>
          <button
            type="button"
            onClick={() => {
              const base = getCurrentBasePrompt();
              resetCustomPromptProfiles(base);
              toast.success('Regenerated all model-size profiles from current base prompt');
            }}
            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-500/20"
          >
            Regenerate Profiles
          </button>
          <button
            type="button"
            onClick={() => {
              const base = getCurrentBasePrompt();
              updateCustomPromptProfile(editorProfileKey, { instructions: base, mode: 'replace' });
              setCustomPromptEnabled(true);
              toast.success(`Loaded base prompt into ${editorProfileKey}`);
            }}
            className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-500 hover:bg-blue-500/20"
          >
            Load Base Into Selected
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-bolt-elements-borderColor">
          <table className="w-full text-sm">
            <thead className="bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary">
              <tr>
                <th className="px-3 py-2 text-left">Model Size</th>
                <th className="px-3 py-2 text-left">Mode</th>
                <th className="px-3 py-2 text-left">Used Tokens</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleProfileKeys.map((key) => {
                const profile = customPromptProfiles[key];
                const isActive = key === activeModelProfileKey;
                const isSelected = key === editorProfileKey;

                return (
                  <tr key={key} className={classNames('border-t border-bolt-elements-borderColor', isActive && 'bg-purple-500/5')}>
                    <td className="px-3 py-2 text-bolt-elements-textPrimary">{key}</td>
                    <td className="px-3 py-2 text-bolt-elements-textSecondary">{profile.mode}</td>
                    <td className="px-3 py-2 text-bolt-elements-textSecondary">{estimateTokenCount(profile.instructions)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomPromptProfileKey(key);
                            setIsEditorReadOnly(true);
                            toast.success(`Loaded ${key} profile in read-only mode`);
                          }}
                          className={classNames(
                            'rounded-lg px-2 py-1 text-xs',
                            isSelected
                              ? 'bg-purple-500/20 text-purple-500'
                              : 'bg-bolt-elements-background-depth-3 text-bolt-elements-textSecondary',
                          )}
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCustomPromptProfile(key, { ...profile, mode: 'append' })}
                          className="rounded-lg bg-bolt-elements-background-depth-3 px-2 py-1 text-xs text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-4"
                        >
                          Append
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCustomPromptProfile(key, { ...profile, mode: 'replace' })}
                          className="rounded-lg bg-bolt-elements-background-depth-3 px-2 py-1 text-xs text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-4"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomPromptProfileKey(key);
                            setIsEditorReadOnly(false);
                            toast.success(`Editing ${key} profile`);
                          }}
                          className="rounded-lg bg-bolt-elements-background-depth-3 px-2 py-1 text-xs text-bolt-elements-textSecondary hover:bg-bolt-elements-background-depth-4"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <textarea
            value={editorProfile.instructions}
            onChange={(e) => {
              if (isEditorReadOnly) {
                return;
              }

              updateCustomPromptProfile(editorProfileKey, { ...editorProfile, instructions: e.target.value });
            }}
            placeholder="Example: Always answer in Finnish, prioritize minimal dependencies, and explain trade-offs briefly."
            rows={10}
            readOnly={isEditorReadOnly}
            className={classNames(
              'w-full rounded-lg border border-bolt-elements-borderColor p-3 text-sm',
              'bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary',
              'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
              'resize-y',
              isEditorReadOnly && 'cursor-not-allowed opacity-90',
            )}
          />
          <p className="mt-2 text-xs text-bolt-elements-textSecondary">
            Editing profile {editorProfileKey}. {editorProfile.mode === 'replace' ? 'Replace mode applies this as full system prompt.' : 'Append mode appends this after the base prompt.'}
          </p>
          <p className="mt-1 text-xs text-bolt-elements-textSecondary">
            Editor mode: {isEditorReadOnly ? 'Read-only preview (loaded)' : 'Editable'}
          </p>
          <p className="mt-2 text-xs text-bolt-elements-textSecondary">
            Active model: {selectedModelInfo?.label || selectedModel || 'Unknown'} · Max tokens: {maxTokens || 'Unknown'} · Used: {usedTokens} · Left: {maxTokens ? tokensLeft : 'Unknown'}
          </p>
        </div>
      </div>
    </div>
  );
}
