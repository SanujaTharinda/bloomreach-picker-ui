import { Result } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import type { UnauthorizedScreenProps } from '../types'
import '../styles/UnauthorizedScreen.scss'

export const UnauthorizedScreen: React.FC<UnauthorizedScreenProps> = ({ message }) => {
  return (
    <div className="unauthorized-screen">
      <Result
        status="403"
        icon={<LockOutlined className="unauthorized-screen__icon" />}
        title="Unauthorized Access"
        subTitle={message || "API key is missing or invalid. Please configure a valid API key to access the DAM Asset Picker."}
      />
    </div>
  )
}

