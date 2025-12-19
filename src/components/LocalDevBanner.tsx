/**
 * Banner component to show when running in local development mode
 */

import { Alert } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'

export const LocalDevBanner: React.FC = () => {
  return (
    <Alert
      message="Local Development Mode"
      description="Running in mock mode. Use URL parameters to configure: ?apiKey=xxx&mode=edit&value=xxx&dialog=true"
      type="info"
      icon={<InfoCircleOutlined />}
      showIcon
      closable
      style={{ marginBottom: '1rem' }}
    />
  )
}

