import { createContext, useContext } from 'react'

interface AppCtx {
  activeTab: string
  setActiveTab: (t: string) => void
}

export const AppContext = createContext<AppCtx>({
  activeTab: 'manifest',
  setActiveTab: () => {},
})

export function useAppContext() {
  return useContext(AppContext)
}
