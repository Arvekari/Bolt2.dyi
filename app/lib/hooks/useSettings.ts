import { useStore } from '@nanostores/react';
import {
  isDebugMode,
  ollamaBridgedSystemPromptSplitStore,
  isEventLogsEnabled,
  promptStore,
  customPromptEnabledStore,
  customPromptTextStore,
  customPromptModeStore,
  customPromptProfilesStore,
  customPromptProfileKeyStore,
  customPromptAutoProfileStore,
  promptLibraryOverridesStore,
  dbProviderStore,
  dbPostgresUrlStore,
  providersStore,
  latestBranchStore,
  autoSelectStarterTemplate,
  enableContextOptimizationStore,
  tabConfigurationStore,
  resetTabConfiguration as resetTabConfig,
  updateProviderSettings as updateProviderSettingsStore,
  updateDebugMode,
  updateOllamaBridgedSystemPromptSplit,
  updateLatestBranch,
  updateAutoSelectTemplate,
  updateContextOptimization,
  updateEventLogs,
  updatePromptId,
  updateCustomPromptEnabled,
  updateCustomPromptText,
  updateCustomPromptMode,
  updateCustomPromptProfile,
  updateCustomPromptProfileKey,
  updateCustomPromptAutoProfile,
  resetCustomPromptProfiles,
  updatePromptLibraryOverride as updatePromptLibraryOverrideStore,
  removePromptLibraryOverride as removePromptLibraryOverrideStore,
  resetPromptLibraryOverrides as resetPromptLibraryOverridesStore,
  updateDbProvider,
  updateDbPostgresUrl,
} from '~/lib/stores/settings';
import { useCallback, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import type { IProviderSetting, ProviderInfo, IProviderConfig } from '~/types/model';
import type { TabWindowConfig } from '~/components/@settings/core/types';
import { logStore } from '~/lib/stores/logs';
import { getLocalStorage, setLocalStorage } from '~/lib/persistence';
import { syncServerPersistence } from '~/lib/persistence/serverPersistence.client';
import type { ModelSizeProfileKey, PromptMode, SystemPromptProfiles } from '~/lib/common/system-prompt-profiles';
import { resolveProfileKeyForModel } from '~/lib/common/system-prompt-profiles';
import { availableModelsStore, selectedModelStore } from '~/lib/stores/model';

export interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: boolean;
  eventLogs: boolean;
  timezone: string;
  tabConfiguration: TabWindowConfig;
}

export interface UseSettingsReturn {
  // Theme and UI settings
  setTheme: (theme: Settings['theme']) => void;
  setLanguage: (language: string) => void;
  setNotifications: (enabled: boolean) => void;
  setEventLogs: (enabled: boolean) => void;
  setTimezone: (timezone: string) => void;
  settings: Settings;

  // Provider settings
  providers: Record<string, IProviderConfig>;
  activeProviders: ProviderInfo[];
  updateProviderSettings: (provider: string, config: IProviderSetting) => void;

  // Debug and development settings
  debug: boolean;
  enableDebugMode: (enabled: boolean) => void;
  eventLogs: boolean;
  ollamaBridgedSystemPromptSplit: boolean;
  setOllamaBridgedSystemPromptSplit: (enabled: boolean) => void;
  promptId: string;
  setPromptId: (promptId: string) => void;
  customPromptEnabled: boolean;
  setCustomPromptEnabled: (enabled: boolean) => void;
  customPromptText: string;
  setCustomPromptText: (text: string) => void;
  customPromptMode: 'append' | 'replace';
  setCustomPromptMode: (mode: 'append' | 'replace') => void;
  customPromptProfiles: SystemPromptProfiles;
  updateCustomPromptProfile: (key: ModelSizeProfileKey, profile: { instructions: string; mode: PromptMode }) => void;
  resetCustomPromptProfiles: (sourceText: string) => void;
  customPromptProfileKey: ModelSizeProfileKey;
  setCustomPromptProfileKey: (key: ModelSizeProfileKey) => void;
  customPromptAutoProfile: boolean;
  setCustomPromptAutoProfile: (enabled: boolean) => void;
  activeModelProfileKey: ModelSizeProfileKey;
  promptLibraryOverrides: Record<string, string>;
  setPromptLibraryOverride: (promptId: string, text: string) => void;
  removePromptLibraryOverride: (promptId: string) => void;
  resetPromptLibraryOverrides: () => void;
  dbProvider: 'sqlite' | 'postgres';
  setDbProvider: (provider: 'sqlite' | 'postgres') => void;
  dbPostgresUrl: string;
  setDbPostgresUrl: (url: string) => void;
  isLatestBranch: boolean;
  enableLatestBranch: (enabled: boolean) => void;
  autoSelectTemplate: boolean;
  setAutoSelectTemplate: (enabled: boolean) => void;
  contextOptimizationEnabled: boolean;
  enableContextOptimization: (enabled: boolean) => void;

  // Tab configuration
  tabConfiguration: TabWindowConfig;
  resetTabConfiguration: () => void;
}

// Add interface to match ProviderSetting type
interface ProviderSettingWithIndex extends IProviderSetting {
  [key: string]: any;
}

export function useSettings(): UseSettingsReturn {
  const providers = useStore(providersStore);
  const debug = useStore(isDebugMode);
  const ollamaBridgedSystemPromptSplit = useStore(ollamaBridgedSystemPromptSplitStore);
  const eventLogs = useStore(isEventLogsEnabled);
  const promptId = useStore(promptStore);
  const customPromptEnabled = useStore(customPromptEnabledStore);
  const customPromptText = useStore(customPromptTextStore);
  const customPromptMode = useStore(customPromptModeStore);
  const customPromptProfiles = useStore(customPromptProfilesStore);
  const customPromptProfileKey = useStore(customPromptProfileKeyStore);
  const customPromptAutoProfile = useStore(customPromptAutoProfileStore);
  const promptLibraryOverrides = useStore(promptLibraryOverridesStore);
  const dbProvider = useStore(dbProviderStore);
  const dbPostgresUrl = useStore(dbPostgresUrlStore);
  const isLatestBranch = useStore(latestBranchStore);
  const autoSelectTemplate = useStore(autoSelectStarterTemplate);
  const [activeProviders, setActiveProviders] = useState<ProviderInfo[]>([]);
  const contextOptimizationEnabled = useStore(enableContextOptimizationStore);
  const selectedModel = useStore(selectedModelStore);
  const availableModels = useStore(availableModelsStore);
  const tabConfiguration = useStore(tabConfigurationStore);
  const [settings, setSettings] = useState<Settings>(() => {
    const storedSettings = getLocalStorage('settings');
    return {
      theme: storedSettings?.theme || 'system',
      language: storedSettings?.language || 'en',
      notifications: storedSettings?.notifications ?? true,
      eventLogs: storedSettings?.eventLogs ?? true,
      timezone: storedSettings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      tabConfiguration,
    };
  });

  useEffect(() => {
    const active = Object.entries(providers)
      .filter(([_key, provider]) => provider.settings.enabled)
      .map(([_k, p]) => p);

    setActiveProviders(active);
  }, [providers]);

  const saveSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      setLocalStorage('settings', updated);

      return updated;
    });
  }, []);

  const updateProviderSettings = useCallback((provider: string, config: ProviderSettingWithIndex) => {
    updateProviderSettingsStore(provider, config);
  }, []);

  const enableDebugMode = useCallback((enabled: boolean) => {
    updateDebugMode(enabled);
    logStore.logSystem(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    Cookies.set('isDebugEnabled', String(enabled));
  }, []);

  const setEventLogs = useCallback((enabled: boolean) => {
    updateEventLogs(enabled);
    logStore.logSystem(`Event logs ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const setOllamaBridgedSystemPromptSplit = useCallback((enabled: boolean) => {
    updateOllamaBridgedSystemPromptSplit(enabled);
    logStore.logSystem(`Ollama bridged prompt split ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const setPromptId = useCallback((id: string) => {
    updatePromptId(id);
    logStore.logSystem(`Prompt template updated to ${id}`);
  }, []);

  const setCustomPromptEnabled = useCallback((enabled: boolean) => {
    updateCustomPromptEnabled(enabled);
    logStore.logSystem(`Custom prompt ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const setCustomPromptText = useCallback((text: string) => {
    updateCustomPromptText(text);
    logStore.logSystem('Custom prompt text updated');
  }, []);

  const setCustomPromptMode = useCallback((mode: 'append' | 'replace') => {
    updateCustomPromptMode(mode);
    logStore.logSystem(`Custom prompt mode set to ${mode}`);
  }, []);

  const setCustomPromptProfileKey = useCallback((key: ModelSizeProfileKey) => {
    updateCustomPromptProfileKey(key);
    logStore.logSystem(`Custom prompt profile selected: ${key}`);
  }, []);

  const setCustomPromptAutoProfile = useCallback((enabled: boolean) => {
    updateCustomPromptAutoProfile(enabled);
    logStore.logSystem(`Automatic model-size prompt profile ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const applyCustomPromptProfile = useCallback(
    (key: ModelSizeProfileKey, profile: { instructions: string; mode: PromptMode }) => {
      updateCustomPromptProfile(key, profile);
      logStore.logSystem(`Updated custom prompt profile ${key}`);
    },
    [],
  );

  const resetPromptProfilesFromText = useCallback((sourceText: string) => {
    resetCustomPromptProfiles(sourceText);
    logStore.logSystem('Reset custom prompt profiles from current text');
  }, []);

  const setPromptLibraryOverride = useCallback((promptId: string, text: string) => {
    updatePromptLibraryOverrideStore(promptId, text);
    logStore.logSystem(`Updated prompt library override: ${promptId}`);
  }, []);

  const removePromptLibraryOverride = useCallback((promptId: string) => {
    removePromptLibraryOverrideStore(promptId);
    logStore.logSystem(`Removed prompt library override: ${promptId}`);
  }, []);

  const resetPromptLibraryOverrides = useCallback(() => {
    resetPromptLibraryOverridesStore();
    logStore.logSystem('Restored prompt library defaults');
  }, []);

  const activeModelProfileKey = (() => {
    if (!customPromptEnabled && !customPromptAutoProfile) {
      return customPromptProfileKey;
    }

    const modelFromList = availableModels.find((model) => model.name === selectedModel);
    const modelName = modelFromList?.name || selectedModel || '';

    return resolveProfileKeyForModel(modelName);
  })();

  useEffect(() => {
    if (customPromptEnabled && !customPromptAutoProfile) {
      updateCustomPromptAutoProfile(true);
    }
  }, [customPromptEnabled, customPromptAutoProfile]);

  useEffect(() => {
    const profile = customPromptProfiles[activeModelProfileKey];

    if (!profile) {
      return;
    }

    if (customPromptText !== profile.instructions) {
      updateCustomPromptText(profile.instructions);
    }

    if (customPromptMode !== profile.mode) {
      updateCustomPromptMode(profile.mode);
    }
  }, [activeModelProfileKey, customPromptProfiles, customPromptText, customPromptMode]);

  const setDbProvider = useCallback((provider: 'sqlite' | 'postgres') => {
    updateDbProvider(provider);
    logStore.logSystem(`Database provider set to ${provider}`);
  }, []);

  const setDbPostgresUrl = useCallback((url: string) => {
    updateDbPostgresUrl(url);
    logStore.logSystem('Database connection string updated');
  }, []);

  const enableLatestBranch = useCallback((enabled: boolean) => {
    updateLatestBranch(enabled);
    logStore.logSystem(`Main branch updates ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const setAutoSelectTemplate = useCallback((enabled: boolean) => {
    updateAutoSelectTemplate(enabled);
    logStore.logSystem(`Auto select template ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const enableContextOptimization = useCallback((enabled: boolean) => {
    updateContextOptimization(enabled);
    logStore.logSystem(`Context optimization ${enabled ? 'enabled' : 'disabled'}`);
  }, []);

  const setTheme = useCallback(
    (theme: Settings['theme']) => {
      saveSettings({ theme });
    },
    [saveSettings],
  );

  const setLanguage = useCallback(
    (language: string) => {
      saveSettings({ language });
    },
    [saveSettings],
  );

  const setNotifications = useCallback(
    (enabled: boolean) => {
      saveSettings({ notifications: enabled });
    },
    [saveSettings],
  );

  const setTimezone = useCallback(
    (timezone: string) => {
      saveSettings({ timezone });
    },
    [saveSettings],
  );

  useEffect(() => {
    const providers = providersStore.get();
    const providerSetting: Record<string, IProviderSetting> = {}; // preserve the entire settings object for each provider
    Object.keys(providers).forEach((provider) => {
      providerSetting[provider] = providers[provider].settings;
    });
    Cookies.set('providers', JSON.stringify(providerSetting));
    void syncServerPersistence({ providerSettings: providerSetting });
  }, [providers]);

  useEffect(() => {
    const customPrompt = {
      enabled: customPromptEnabled,
      instructions: customPromptText,
      mode: customPromptMode,
      promptLibraryOverrides,
    };
    Cookies.set('customPrompt', JSON.stringify(customPrompt));
    void syncServerPersistence({ customPrompt });
  }, [customPromptEnabled, customPromptText, customPromptMode, promptLibraryOverrides]);

  useEffect(() => {
    const dbConfig = {
      provider: dbProvider,
      postgresUrl: dbPostgresUrl,
    };

    Cookies.set('dbConfig', JSON.stringify(dbConfig));
    void syncServerPersistence({ dbConfig });
  }, [dbProvider, dbPostgresUrl]);

  return {
    ...settings,
    providers,
    activeProviders,
    updateProviderSettings,
    debug,
    enableDebugMode,
    eventLogs,
    ollamaBridgedSystemPromptSplit,
    setOllamaBridgedSystemPromptSplit,
    setEventLogs,
    promptId,
    setPromptId,
    customPromptEnabled,
    setCustomPromptEnabled,
    customPromptText,
    setCustomPromptText,
    customPromptMode,
    setCustomPromptMode,
    customPromptProfiles,
    updateCustomPromptProfile: applyCustomPromptProfile,
    resetCustomPromptProfiles: resetPromptProfilesFromText,
    customPromptProfileKey,
    setCustomPromptProfileKey,
    customPromptAutoProfile,
    setCustomPromptAutoProfile,
    activeModelProfileKey,
    promptLibraryOverrides,
    setPromptLibraryOverride,
    removePromptLibraryOverride,
    resetPromptLibraryOverrides,
    dbProvider,
    setDbProvider,
    dbPostgresUrl,
    setDbPostgresUrl,
    isLatestBranch,
    enableLatestBranch,
    autoSelectTemplate,
    setAutoSelectTemplate,
    contextOptimizationEnabled,
    enableContextOptimization,
    setTheme,
    setLanguage,
    setNotifications,
    setTimezone,
    settings,
    tabConfiguration,
    resetTabConfiguration: resetTabConfig,
  };
}
