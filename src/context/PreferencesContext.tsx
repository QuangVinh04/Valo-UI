import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { updateUserSettings } from '@/services/user.service';
import i18n from '@/i18n';

export type Theme = 'dark' | 'light';
export type Language = 'vi' | 'en';

export type UserSettings = {
  theme: Theme;
  language: Language;
};

export type UserSettingsInput = {
  theme?: string | null;
  language?: string | null;
} | null | undefined;

type PreferencesContextValue = UserSettings & {
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  applySettings: (settings: UserSettingsInput, options?: { sync?: boolean }) => void;
};

const defaultSettings: UserSettings = {
  theme: 'dark',
  language: 'vi',
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readSettings(): UserSettings {
  const theme = localStorage.getItem('theme');
  const language = localStorage.getItem('language');

  return normalizeUserSettings({ theme, language });
}

export function normalizeUserSettings(settings: UserSettingsInput): UserSettings {
  return {
    theme: settings?.theme === 'light' ? 'light' : defaultSettings.theme,
    language: settings?.language === 'en' ? 'en' : defaultSettings.language,
  };
}

function persistSettings(settings: UserSettings) {
  localStorage.setItem('theme', settings.theme);
  localStorage.setItem('language', settings.language);
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.lang = settings.language;
  void i18n.changeLanguage(settings.language);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(readSettings);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  const applySettings = useCallback((nextSettings: UserSettingsInput, options?: { sync?: boolean }) => {
    const normalizedSettings = normalizeUserSettings(nextSettings);

    setSettings(normalizedSettings);
    persistSettings(normalizedSettings);

    if (options?.sync === false || !localStorage.getItem('accessToken')) {
      return;
    }

    void updateUserSettings(normalizedSettings).catch(() => {
      // Keep local UI preference even when server sync fails.
    });
  }, []);

  useEffect(() => {
    const handlePreferencesChanged = () => {
      setSettings(readSettings());
    };

    window.addEventListener('storage', handlePreferencesChanged);
    window.addEventListener('preferences:changed', handlePreferencesChanged);

    return () => {
      window.removeEventListener('storage', handlePreferencesChanged);
      window.removeEventListener('preferences:changed', handlePreferencesChanged);
    };
  }, []);

  const value = useMemo<PreferencesContextValue>(() => ({
    ...settings,
    setTheme: (theme) => applySettings({ ...settings, theme }),
    setLanguage: (language) => applySettings({ ...settings, language }),
    applySettings,
  }), [applySettings, settings]);

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used inside PreferencesProvider');
  }

  return context;
}
