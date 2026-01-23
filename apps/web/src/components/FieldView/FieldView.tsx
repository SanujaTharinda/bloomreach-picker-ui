import { useEffect } from 'react'
import { Button, Space, Typography, Image } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { DocumentEditorMode } from '@bloomreach/ui-extension-saas'
import { useBloomreachContext } from '../../contexts/BloomreachContext'
import { parseAssetFromValue } from '../../utils/assetUtils'
import styles from './FieldView.module.scss'

const { Text } = Typography

export const FieldView = () => {
  const { ui, selectedAsset, setSelectedAsset, mode, isDialogMode, getDialogSize } = useBloomreachContext()

  const hasValue = selectedAsset !== null
  const isEditMode = mode === DocumentEditorMode.Edit

  useEffect(() => {
    if (ui && !isDialogMode) {
      const height = hasValue ? 300 : 200
      ui.document.field.setHeight(height).catch((err) => {
        console.warn('Failed to set iframe height:', err)
      })
    }
  }, [ui, isDialogMode, hasValue])

  const handleAdd = async () => {
    if (!ui) return

    try {
      const selectedValue = await ui.dialog.open({
        title: 'Brompton DAM',
        url: window.location.href,
        size: getDialogSize(),
      }) as string | undefined

      if (selectedValue) {
        const parsed = parseAssetFromValue(selectedValue)
        if (parsed) {
          await ui.document.field.setValue(selectedValue)
          setSelectedAsset(parsed)
        }
      }
    } catch (err) {
      const e = err as { code?: string; message?: string }
      if (e.code !== 'DialogCanceled')
        console.error('Error opening dialog:', e.code, e.message)
    }
  }

  const handleClear = async () => {
    if (!ui || !isEditMode) return

    try {
      await ui.document.field.setValue('')
      setSelectedAsset(null)
    } catch (err) {
      const e = err as { code?: string; message?: string }
      console.error('Error clearing field value:', e.code, e.message)
    }
  }

  return (
    <div className={styles.fieldView}>
      <Space orientation="vertical" size="small">
        {selectedAsset && (
          <div className={styles.assetPreview}>
            <div className={styles.assetImageWrapper}>
              <Image
                src={selectedAsset.cdn_url}
                alt={selectedAsset.title}
                className={styles.assetImage}
                preview={false}
                fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E"
              />
            </div>
            <div className={styles.assetInfo}>
              <Text strong className={styles.assetFilename}>
                {selectedAsset.title}
              </Text>
              {selectedAsset.description && (
                <Text type="secondary" className={styles.assetAlt}>
                  {selectedAsset.description}
                </Text>
              )}
            </div>
          </div>
        )}
        <Space>
          <Button
            type="default"
            icon={hasValue ? <EditOutlined /> : <PlusOutlined />}
            onClick={handleAdd}
            disabled={!isEditMode}
          >
            {hasValue ? 'Edit' : 'Add'}
          </Button>
          <Button
            type="default"
            danger
            icon={<DeleteOutlined />}
            onClick={handleClear}
            disabled={!isEditMode || !hasValue}
          >
            Clear
          </Button>
        </Space>
      </Space>
    </div>
  )
}
