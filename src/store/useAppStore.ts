import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  selectedCabinaId: string | null
  setSelectedCabinaId: (id: string | null) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedCabinaId: null,
      activeTab: 'dashboard',
      sidebarCollapsed: false,
      setSelectedCabinaId: (id) => set({ selectedCabinaId: id }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    }),
    {
      name: 'spaxion-ui',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
)
