import { Card, Spin, Empty, Typography } from 'antd';
import type { AssetGridProps } from '../types';
import '../styles/AssetGrid.scss';

const { Text } = Typography

export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="asset-grid__loading">
        <Spin size="large" />
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="asset-grid__empty">
        <Empty description="No assets found in this collection" />
      </div>
    )
  }

  return (
    <div className="asset-grid">
      {assets.map((asset) => {
        const isSelected = selectedAssetId === asset.id

        return (
          <Card
            key={asset.id}
            hoverable
            className={`asset-grid__card ${
              isSelected ? 'asset-grid__card--selected' : 'asset-grid__card--unselected'
            }`}
            onClick={() => onSelectAsset(asset)}
            bodyStyle={{ padding: '0.75rem' }}
          >
            <div className="asset-grid__image-wrapper">
              <img
                src={asset.url}
                alt={asset.alt}
                className="asset-grid__image"
              />
            </div>
            <div className="asset-grid__info">
              <Text strong className="asset-grid__info-filename">
                {asset.filename}
              </Text>
              <Text type="secondary" className="asset-grid__info-dimensions">
                {asset.width} × {asset.height}
              </Text>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

