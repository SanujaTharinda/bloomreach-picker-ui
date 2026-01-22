import { Spin } from 'antd'
import { useState } from 'react'
import { useAuthentication } from '../../hooks/useAuthentication'
import { useCollections } from '../../hooks/useCollections'
import { useAssets } from '../../hooks/useAssets'
import { AuthProvider } from '../../contexts/AuthContext'
import { UnauthorizedScreen } from '../UnauthorizedScreen'
import { DamPickerLayout } from '../DamPickerLayout'
import { LocalDevBanner } from '../LocalDevBanner'
import { isLocalDevelopment } from '../../utils/bloomreachMock'

import type { CollectionPathItem } from '../../types'

const DamPickerContent: React.FC = () => {
  const {
    collections,
    collectionsLoading,
    error: collectionsError,
    selectedCollectionId,
    handleSelectCollection: originalHandleSelectCollection,
    loadCollectionChildren,
  } = useCollections()

  const [viewAll, setViewAll] = useState(true)
  const [selectedCollectionPath, setSelectedCollectionPath] = useState<CollectionPathItem[]>([])

  const handleSelectCollection = (collectionId: string | null, collectionPath?: CollectionPathItem[]) => {
    originalHandleSelectCollection(collectionId)
    setSelectedCollectionPath(collectionPath || [])
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
  } = useAssets(selectedCollectionId, viewAll)

  const handleSelectAssetWithErrorHandling = async (asset: any) => {
    try {
      await handleSelectAsset(asset)
    } catch (err: any) {
      // Could show a toast notification here if needed
    }
  }

  const error = collectionsError || assetsError

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
      <DamPickerLayout
        collections={collections}
        selectedCollectionId={selectedCollectionId}
        selectedCollectionPath={selectedCollectionPath}
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

export const DamPickerView: React.FC = () => {
  const authData = useAuthentication()
  const { isAuthenticated, authLoading, authError } = authData

  if (authLoading)
    return <div className="app__loading"><Spin size="large" /></div>

  if (!isAuthenticated)
    return <UnauthorizedScreen message={authError} />

  return <AuthProvider value={authData}><DamPickerContent /></AuthProvider>
}

