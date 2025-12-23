import { Result } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import type { UnauthorizedScreenProps } from '../../types'
import styles from './UnauthorizedScreen.module.scss'

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({ message }) => {
  return (
    <div className={styles.unauthorizedScreen}>
      <Result
        status="403"
        icon={<LockOutlined className={styles.icon} />}
        title="Unauthorized Access"
        subTitle={message || "API key is missing or invalid. Please configure a valid API key to access the DAM Asset Picker."}
      />
    </div>
  )
}

