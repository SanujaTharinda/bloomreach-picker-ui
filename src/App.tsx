import { Spin } from 'antd'
import { useBloomreachContext } from './contexts/BloomreachContext'
import { useAuthContext } from './contexts/AuthContext'
import { useCollections } from './hooks/useCollections'
import { useAssets } from './hooks/useAssets'
import { UnauthorizedScreen } from './components/UnauthorizedScreen'
import { DamPickerLayout } from './components/DamPickerLayout'
import { FieldView } from './components/FieldView'
import { LocalDevBanner } from './components/LocalDevBanner'
import { isLocalDevelopment } from './utils/bloomreachMock'
import './styles/App.scss'

function App() {
  const { isLoading: extensionLoading, error: extensionError, isDialogMode } = useBloomreachContext();
  const { isAuthenticated, authLoading, authError } = useAuthContext();
  const {
    collections,
    collectionsLoading,
    error: collectionsError,
    selectedCollectionId,
    handleSelectCollection,
  } = useCollections();
  const {
    assets,
    assetsLoading,
    error: assetsError,
    selectedAssetId,
    handleSelectAsset,
  } = useAssets(selectedCollectionId);

  const handleSelectAssetWithErrorHandling = async (asset: any) => {
    try {
      await handleSelectAsset(asset);
    } catch (err: any) {
      // Could show a toast notification here if needed
    }
  }

  const error = extensionError || collectionsError || assetsError

  if (extensionLoading || authLoading) {
    return (
      <div className="app__loading">
        <Spin size="large" />
      </div>
    );
  }

  if (error && isAuthenticated) {
    return (
      <div className="app__error">
        <p className="app__error-message">{error}</p>
      </div>
    );
  }

  if (!isDialogMode) {
    return (
      <>
        {isLocalDevelopment() && <LocalDevBanner />}
        <FieldView />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <UnauthorizedScreen message={authError} />
    );
  }

  return (
    <>
      {isLocalDevelopment() && <LocalDevBanner />}
      <DamPickerLayout
        collections={collections}
        selectedCollectionId={selectedCollectionId}
        assets={assets}
        selectedAssetId={selectedAssetId}
        collectionsLoading={collectionsLoading}
        assetsLoading={assetsLoading}
        onSelectCollection={handleSelectCollection}
        onSelectAsset={handleSelectAssetWithErrorHandling}
      />
    </>
  )
}

export default App
