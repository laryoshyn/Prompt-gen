import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsStore {
  // UI preferences
  theme: 'light' | 'dark' | 'system';
  monacoFontSize: number;

  // Export preferences
  preferredExportMethod: 'download' | 'clipboard' | 'zip' | 'filesystem';
  defaultExportPath: string | null;

  // Auto-save
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // milliseconds

  // Actions
  updateSetting: <K extends keyof SettingsStore>(
    key: K,
    value: SettingsStore[K]
  ) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Defaults
      theme: 'system',
      monacoFontSize: 14,
      preferredExportMethod: 'download',
      defaultExportPath: null,
      autoSaveEnabled: true,
      autoSaveInterval: 2500, // 2.5 seconds

      updateSetting: (key, value) => set({ [key]: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
