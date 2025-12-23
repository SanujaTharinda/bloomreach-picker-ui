import { Spin } from 'antd'
import { useState } from 'react'
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
    handleSelectCollection: originalHandleSelectCollection,
    loadCollectionChildren,
  } = useCollections();
  
  // View all mode state - default to true to show all assets on initial load
  const [viewAll, setViewAll] = useState(true);

  // Reset viewAll when collection is selected (switch back to collection view)
  const handleSelectCollection = (collectionId: string | null) => {
    originalHandleSelectCollection(collectionId)
    // Always reset viewAll when a collection is selected
    setViewAll(false)
  }
  
  const {
    assets,
    assetsLoading,
    error: assetsError,
    selectedAssetId,
    handleSelectAsset,
    currentPage,
    totalPages,
    totalAssets,
    handlePageChange,
    searchQuery,
    handleSearch,
  } = useAssets(selectedCollectionId, viewAll);

  const handleSelectAssetWithErrorHandling = async (asset: any) => {
    try {
      await handleSelectAsset(asset);
    } catch (err: any) {
      // Could show a toast notification here if needed
    }
  }

  const error = extensionError || collectionsError || assetsError

  // Show loading only while extension is loading (API key setup)
  if (extensionLoading || authLoading) {
    return (
      <div className="app__loading">
        <Spin size="large" />
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

  // Show unauthorized screen if not authenticated (determined by API responses)
  if (!isAuthenticated) {
    return (
      <UnauthorizedScreen message={authError} />
    );
  }

  // Show error screen for non-auth errors
  if (error) {
    return (
      <div className="app__error">
        <p className="app__error-message">{error}</p>
      </div>
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
        searchQuery={searchQuery}
        onSearch={handleSearch}
        viewAll={viewAll}
        onViewAllChange={setViewAll}
        currentPage={currentPage}
        totalPages={totalPages}
        totalAssets={totalAssets}
        onPageChange={handlePageChange}
        loadCollectionChildren={loadCollectionChildren}
      />
    </>
  )
}

export default App
