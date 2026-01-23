import { createContext, useContext } from 'react'
import type { BloomreachContextValue, BloomreachProviderProps } from '../types'

const BloomreachContext = createContext<BloomreachContextValue | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useBloomreachContext = () => {
  const context = useContext(BloomreachContext)
  if (context === undefined) {
    throw new Error('useBloomreachContext must be used within a BloomreachProvider')
  }
  return context
}

export const BloomreachProvider = ({ value, children }: BloomreachProviderProps) => {
  return <BloomreachContext.Provider value={value}>{children}</BloomreachContext.Provider>
}

