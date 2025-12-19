import { Layout } from 'antd'
import { CollectionsTree } from './CollectionsTree'
import { AssetGrid } from './AssetGrid'
import type { DamPickerLayoutProps } from '../types'
import '../styles/DamPickerLayout.scss'

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
    <Layout className="dam-picker-layout">
      <Header className="dam-picker-layout__top-header">
        <div className="dam-picker-layout__header-content">
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Brompton_Bicycle_logo.svg/960px-Brompton_Bicycle_logo.svg.png?20120811083043"
            alt="Brompton Bicycle"
            className="dam-picker-layout__logo"
          />
          <h1 className="dam-picker-layout__title">Brompton Resource Space</h1>
        </div>
      </Header>
      <Layout className="dam-picker-layout__body">
        <Sider width={300} className="dam-picker-layout__sider">
          <div className="dam-picker-layout__sidebar-header">
            <h3 className="dam-picker-layout__sidebar-title">Collections</h3>
          </div>
          <CollectionsTree
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            onSelectCollection={onSelectCollection}
            loading={collectionsLoading}
          />
        </Sider>
        <Content className="dam-picker-layout__content">
          <div className="dam-picker-layout__content-header">
            <h3 className="dam-picker-layout__content-title">
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

