import { Button, Space, Typography } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import type { PaginationControlsProps } from '../../types/components'
import styles from './PaginationControls.module.scss'

const { Text } = Typography

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalAssets,
  pageSize,
  onPageChange,
  loading = false,
}) => {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const startItem = totalAssets === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(currentPage * pageSize, totalAssets)

  return (
    <div className={styles.paginationControls}>
      <Text type="secondary" className={styles.info}>
        Showing {startItem}-{endItem} of {totalAssets} assets
      </Text>
      <Space>
        <Button
          icon={<LeftOutlined />}
          onClick={handlePrevious}
          disabled={currentPage <= 1 || loading}
        >
          Previous
        </Button>
        <Text type="secondary" className={styles.pageInfo}>
          Page {currentPage} of {totalPages}
        </Text>
        <Button
          icon={<RightOutlined />}
          onClick={handleNext}
          disabled={currentPage >= totalPages || loading}
        >
          Next
        </Button>
      </Space>
    </div>
  )
}

