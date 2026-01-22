import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import { useBloomreachExtension } from './hooks/useBloomreachExtension'
import { BloomreachProvider } from './contexts/BloomreachContext'
import App from './App.tsx'
import './index.scss'

function AppProviders() {
  const bloomreachData = useBloomreachExtension();

  return (
    <BloomreachProvider value={bloomreachData}>
      <App />
    </BloomreachProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider>
      <AppProviders />
    </ConfigProvider>
  </StrictMode>,
)
