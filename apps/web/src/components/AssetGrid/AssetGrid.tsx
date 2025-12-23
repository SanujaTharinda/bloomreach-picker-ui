import { Card, Spin, Empty, Typography } from 'antd';
import type { AssetGridProps } from '../../types';
import styles from './AssetGrid.module.scss';

const { Text } = Typography

export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className={styles.empty}>
        <Empty description="No assets found in this collection" />
      </div>
    )
  }

  return (
    <div className={styles.assetGrid}>
      {assets.map((asset) => {
        const isSelected = selectedAssetId === asset.id

        return (
          <Card
            key={asset.id}
            hoverable
            className={`${styles.card} ${
              isSelected ? styles.cardSelected : styles.cardUnselected
            }`}
            onClick={() => onSelectAsset(asset)}
            bodyStyle={{ padding: '0.75rem' }}
          >
            <div className={styles.imageWrapper}>
              <img
                src={asset.thumbnailUrl || asset.url || ''}
                alt={asset.title || asset.alt || ''}
                className={styles.image}
              />
            </div>
            <div className={styles.info}>
              <Text strong className={styles.infoFilename}>
                {asset.title || asset.filename || ''}
              </Text>
              <Text type="secondary" className={styles.infoDimensions}>
                {asset.dimensions?.width || asset.width || 0} × {asset.dimensions?.height || asset.height || 0}
              </Text>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

