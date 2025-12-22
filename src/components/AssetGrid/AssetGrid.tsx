import { Card, Spin, Empty, Typography } from 'antd';
import type { AssetGridProps } from '../../types';
import styles from './AssetGrid.module.scss';

const { Text } = Typography

export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  loading = false,
  currentPage,
  totalPages,
  totalAssets,
  onPageChange,
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
                src={asset.url}
                alt={asset.alt}
                className={styles.image}
              />
            </div>
            <div className={styles.info}>
              <Text strong className={styles.infoFilename}>
                {asset.filename}
              </Text>
              <Text type="secondary" className={styles.infoDimensions}>
                {asset.width} × {asset.height}
              </Text>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

