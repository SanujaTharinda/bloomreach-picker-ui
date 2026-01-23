import { Spin } from 'antd'
import { useAuthentication } from '../../hooks/useAuthentication'
import { AuthProvider } from '../../contexts/AuthContext'
import { DamPickerProvider, useDamPickerContext } from '../../contexts/DamPickerContext'
import { UnauthorizedScreen } from '../UnauthorizedScreen'
import { DamPickerLayout } from '../DamPickerLayout'
import { LocalDevBanner } from '../LocalDevBanner'
import { isLocalDevelopment } from '../../utils/bloomreachMock'

const DamPickerContent = () => {
  const { error } = useDamPickerContext()

  if (error) {
    return (
      <div className="app__error">
        <p className="app__error-message">{error}</p>
      </div>
    )
  }

  return (
    <>
      {isLocalDevelopment() && <LocalDevBanner />}
      <DamPickerLayout />
    </>
  )
}

const AuthenticatedDamPicker = () => (
  <DamPickerProvider>
    <DamPickerContent />
  </DamPickerProvider>
)

export const DamPickerView = () => {
  const authData = useAuthentication()
  const { isAuthenticated, authLoading, authError } = authData

  if (authLoading)
    return <div className="app__loading"><Spin size="large" /></div>

  if (!isAuthenticated)
    return <UnauthorizedScreen message={authError} />

  return (
    <AuthProvider value={authData}>
      <AuthenticatedDamPicker />
    </AuthProvider>
  )
}
