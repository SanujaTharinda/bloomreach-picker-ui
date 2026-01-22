import { Spin } from 'antd'
import { useBloomreachContext } from './contexts/BloomreachContext'
import { DamPickerView } from './components/DamPickerView'
import { FieldView } from './components/FieldView'
import { LocalDevBanner } from './components/LocalDevBanner'
import { isLocalDevelopment } from './utils/bloomreachMock'
import './styles/App.scss'

function App() {
  const { isLoading: extensionLoading, error: extensionError, isDialogMode } = useBloomreachContext()

  if (extensionLoading)
    return <div className="app__loading"><Spin size="large" /></div>

  if (extensionError)
    return <div className="app__error"><p className="app__error-message">{extensionError}</p></div>

  if (!isDialogMode)
    return (
      <>
        {isLocalDevelopment() && <LocalDevBanner />}
        <FieldView />
      </>
    );

  return <DamPickerView />
}

export default App
