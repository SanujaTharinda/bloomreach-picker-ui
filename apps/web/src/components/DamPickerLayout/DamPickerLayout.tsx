import { Layout, Button, Breadcrumb, Typography } from 'antd'
import { AppstoreOutlined, HomeOutlined } from '@ant-design/icons'
import { CollectionsTree } from '../CollectionsTree'
import { AssetGrid } from '../AssetGrid'
import { SearchBar } from '../SearchBar'
import { PaginationControls } from '../PaginationControls'
import type { DamPickerLayoutProps } from '../../types'
import { getCollectionBreadcrumb } from '../../utils/assetUtils'
import styles from './DamPickerLayout.module.scss'
import { useMemo } from 'react'

const { Sider, Content, Header } = Layout
const { Text } = Typography

export const DamPickerLayout: React.FC<DamPickerLayoutProps> = ({
  collections,
  selectedCollectionId,
  assets,
  selectedAssetId,
  collectionsLoading,
  assetsLoading,
  onSelectCollection,
  onSelectAsset,
  searchQuery,
  onSearch,
  viewAll,
  onViewAllChange,
  currentPage,
  totalPages,
  totalAssets,
  onPageChange,
  loadCollectionChildren,
}) => {

  const handleViewAllClick = () => {
    onViewAllChange(true)
  }

  // Build breadcrumb path
  const breadcrumbItems = useMemo(() => {
    if (viewAll || !selectedCollectionId) {
      return []
    }
    
    const breadcrumb = getCollectionBreadcrumb(collections, selectedCollectionId)
    if (breadcrumb.length === 0) {
      return []
    }
    
    return breadcrumb.map((collection, index) => {
      const isClickable = collection.hasResources
      const isLast = index === breadcrumb.length - 1
      
      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (isClickable && !isLast) {
          onSelectCollection(collection.id)
        }
      }
      
      return {
        title: index === 0 ? (
          <Text 
            onClick={isClickable && !isLast ? handleClick : undefined}
            style={{ 
              cursor: isClickable && !isLast ? 'pointer' : 'default',
              userSelect: 'none'
            }}
            type={isLast ? undefined : 'secondary'}
          >
            <HomeOutlined /> {collection.name}
          </Text>
        ) : (
          <Text 
            onClick={isClickable && !isLast ? handleClick : undefined}
            style={{ 
              cursor: isClickable && !isLast ? 'pointer' : 'default',
              userSelect: 'none'
            }}
            type={isLast ? undefined : 'secondary'}
          >
            {collection.name}
          </Text>
        ),
      }
    })
  }, [collections, selectedCollectionId, viewAll, onSelectCollection])


  return (
    <Layout className={styles.damPickerLayout}>
      <Header className={styles.topHeader}>
        <div className={styles.headerContent}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Brompton_Bicycle_logo.svg/960px-Brompton_Bicycle_logo.svg.png?20120811083043"
            alt="Brompton Bicycle"
            className={styles.logo}
          />
          <h1 className={styles.title}>Brompton Resource Space</h1>
        </div>
      </Header>
      <Layout className={styles.body}>
        <Sider width={300} className={styles.sider}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>Collections</h3>
          </div>
          <CollectionsTree
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={onSelectCollection}
            loading={collectionsLoading}
            loadCollectionChildren={loadCollectionChildren}
          />
        </Sider>
        <Content className={styles.content}>
          <div className={styles.contentScrollable}>
            <div className={styles.contentHeader}>
            <div className={styles.contentHeaderTop}>
              <div className={styles.contentTitleSection}>
                {breadcrumbItems.length > 0 && (
                  <Breadcrumb
                    items={breadcrumbItems}
                    className={styles.breadcrumb}
                  />
                )}
                <h3 className={styles.contentTitle}>
                  {viewAll ? 'All Assets' : selectedCollectionId ? 'Assets' : 'Select a collection to view assets'}
                </h3>
              </div>
              {!viewAll && (
                <Button
                  type="default"
                  icon={<AppstoreOutlined />}
                  onClick={handleViewAllClick}
                >
                  View All Assets
                </Button>
              )}
            </div>
            <SearchBar
              value={searchQuery}
              onSearch={onSearch}
              loading={assetsLoading}
              placeholder={viewAll ? 'Search all assets...' : 'Search assets in collection...'}
            />
          </div>
          <AssetGrid
            assets={assets}
            selectedAssetId={selectedAssetId}
            onSelectAsset={onSelectAsset}
            loading={assetsLoading}
          />
          {totalAssets > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              totalAssets={totalAssets}
              pageSize={30}
              onPageChange={onPageChange}
              loading={assetsLoading}
            />
          )}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
