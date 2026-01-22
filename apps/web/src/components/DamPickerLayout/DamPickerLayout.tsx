import { Layout, Button, Breadcrumb, Typography } from 'antd'
import { AppstoreOutlined } from '@ant-design/icons'
import { CollectionsTree } from '../CollectionsTree'
import { AssetGrid } from '../AssetGrid'
import { SearchBar } from '../SearchBar'
import { PaginationControls } from '../PaginationControls'
import type { DamPickerLayoutProps } from '../../types'
import styles from './DamPickerLayout.module.scss'
import { useMemo } from 'react'

const { Sider, Content, Header } = Layout
const { Text } = Typography

export const DamPickerLayout: React.FC<DamPickerLayoutProps> = ({
  collections,
  selectedCollectionId,
  selectedCollectionPath,
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

  // Build breadcrumb from full collection path
  const breadcrumbItems = useMemo(() => {
    if (viewAll || selectedCollectionPath.length === 0) {
      return [] // No breadcrumb when viewing all assets
    }
    
    return selectedCollectionPath.map((item, index) => {
      const isLast = index === selectedCollectionPath.length - 1
      
      return {
        title: isLast ? (
          <Text style={{ userSelect: 'none' }}>{item.name}</Text>
        ) : (
          <Text type="secondary" style={{ userSelect: 'none' }}>{item.name}</Text>
        ),
      }
    })
  }, [selectedCollectionPath, viewAll])


  return (
    <Layout className={styles.damPickerLayout}>
      <Header className={styles.topHeader}>
        <div className={styles.headerContent}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Brompton_Bicycle_logo.svg/960px-Brompton_Bicycle_logo.svg.png?20120811083043"
            alt="Brompton Bicycle"
            className={styles.logo}
          />
          <h1 className={styles.title}>Brompton DAM</h1>
        </div>
      </Header>
      <Layout className={styles.body}>
        <Sider width={300} className={styles.sider}>
          <div className={styles.sidebarHeader}>
            <h3 className={styles.sidebarTitle}>Collections</h3>
          </div>
          <div className={styles.collectionsScrollable}>
            <CollectionsTree
              collections={collections}
              selectedCollectionId={selectedCollectionId}
              onSelectCollection={onSelectCollection}
              loading={collectionsLoading}
              loadCollectionChildren={loadCollectionChildren}
            />
          </div>
        </Sider>
        <Content className={styles.content}>
          <div className={styles.contentHeader}>
            <div className={styles.contentHeaderTop}>
              <div className={styles.contentTitleSection}>
                {breadcrumbItems.length > 0 ? (
                  <Breadcrumb
                    items={breadcrumbItems}
                    className={styles.breadcrumb}
                  />
                ) : (
                  <h3 className={styles.contentTitle}>
                    {viewAll ? 'All Assets' : 'Select a collection to view assets'}
                  </h3>
                )}
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
          <div className={styles.assetGridScrollable}>
            <AssetGrid
              assets={assets}
              selectedAssetId={selectedAssetId}
              onSelectAsset={onSelectAsset}
              loading={assetsLoading}
            />
          </div>
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
        </Content>
      </Layout>
    </Layout>
  )
}
