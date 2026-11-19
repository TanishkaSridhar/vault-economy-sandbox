import { create } from 'zustand'

interface SettingsState {
  lowGraphics: boolean
  toggleLowGraphics: () => void
}

export const useSettings = create<SettingsState>((set, get) => ({
  lowGraphics: false,
  toggleLowGraphics: () => set({ lowGraphics: !get().lowGraphics }),
}))
