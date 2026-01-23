import { Layout, Button, Breadcrumb, Typography } from 'antd'
import { AppstoreOutlined } from '@ant-design/icons'
import { useMemo } from 'react'
import { useDamPickerContext } from '../../contexts/DamPickerContext'
import { CollectionsTree } from '../CollectionsTree'
import { AssetGrid } from '../AssetGrid'
import { SearchBar } from '../SearchBar'
import { PaginationControls } from '../PaginationControls'
import styles from './DamPickerLayout.module.scss'

const { Sider, Content, Header } = Layout
const { Text } = Typography
const PAGE_SIZE = 30

export const DamPickerLayout = () => {
  const {
    collections,
    assets,
    selectedCollectionId,
    selectedAssetId,
    page,
    total,
    search,
    collectionsLoading,
    assetsLoading,
    totalPages,
    viewAll,
    selectCollection,
    selectAsset,
    setSearch,
    setPage,
    loadCollectionChildren,
    getCollectionPath,
  } = useDamPickerContext()

  const breadcrumbItems = useMemo(() => {
    if (viewAll || !selectedCollectionId) return []

    const path = getCollectionPath(selectedCollectionId)
    return path.map((item, i) => ({
      title: (
        <Text
          type={i === path.length - 1 ? undefined : 'secondary'}
          style={{ userSelect: 'none' }}
        >
          {item.name}
        </Text>
      ),
    }))
  }, [viewAll, selectedCollectionId, getCollectionPath])

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
              onSelectCollection={selectCollection}
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
                  <Breadcrumb items={breadcrumbItems} className={styles.breadcrumb} />
                ) : (
                  <h3 className={styles.contentTitle}>
                    {viewAll && 'All Assets'}
                  </h3>
                )}
              </div>
              {!viewAll && (
                <Button
                  type="default"
                  icon={<AppstoreOutlined />}
                  onClick={() => selectCollection(null)}
                >
                  View All Assets
                </Button>
              )}
            </div>
            <SearchBar
              value={search}
              onSearch={setSearch}
              loading={assetsLoading}
              placeholder={viewAll ? 'Search all assets...' : 'Search assets in collection...'}
            />
          </div>
          <div className={styles.assetGridScrollable}>
            <AssetGrid
              assets={assets}
              selectedAssetId={selectedAssetId}
              onSelectAsset={selectAsset}
              loading={assetsLoading}
            />
          </div>
          {total > 0 && (
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalAssets={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              loading={assetsLoading}
            />
          )}
        </Content>
      </Layout>
    </Layout>
  )
}
