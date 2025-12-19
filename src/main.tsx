import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { useBloomreachExtension } from './hooks/useBloomreachExtension'
import { useAuthentication } from './hooks/useAuthentication'
import { BloomreachProvider } from './contexts/BloomreachContext'
import { AuthProvider } from './contexts/AuthContext'
import App from './App.tsx'
import './index.css'

function AppProviders() {
  const bloomreachData = useBloomreachExtension()

  return (
    <BloomreachProvider value={bloomreachData}>
      <AuthWrapper />
    </BloomreachProvider>
  )
}

function AuthWrapper() {
  const authData = useAuthentication()

  return (
    <AuthProvider value={authData}>
      <App />
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <AppProviders />
    </ConfigProvider>
  </StrictMode>,
)
