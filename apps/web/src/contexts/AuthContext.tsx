import { createContext, useContext } from 'react'
import type { AuthContextValue, AuthProviderProps } from '../types'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ value, children }: AuthProviderProps) => {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

