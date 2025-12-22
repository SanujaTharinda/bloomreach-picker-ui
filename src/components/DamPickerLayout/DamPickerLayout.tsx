import { Layout } from 'antd'
import { CollectionsTree } from '../CollectionsTree'
import { AssetGrid } from '../AssetGrid'
import type { DamPickerLayoutProps } from '../../types'
import styles from './DamPickerLayout.module.scss'

const { Sider, Content, Header } = Layout

export const DamPickerLayout: React.FC<DamPickerLayoutProps> = ({
  collections,
  selectedCollectionId,
  assets,
  selectedAssetId,
  collectionsLoading,
  assetsLoading,
  onSelectCollection,
  onSelectAsset,
}) => {
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
          />
        </Sider>
        <Content className={styles.content}>
          <div className={styles.contentHeader}>
            <h3 className={styles.contentTitle}>
              {selectedCollectionId ? 'Assets' : 'Select a collection to view assets'}
            </h3>
          </div>
          <AssetGrid
            assets={assets}
            selectedAssetId={selectedAssetId}
            onSelectAsset={onSelectAsset}
            loading={assetsLoading}
          />
        </Content>
      </Layout>
    </Layout>
  )
}

