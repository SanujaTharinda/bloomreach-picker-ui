import React, { useState, useEffect } from 'react'
import { Button, Space, Typography, Image } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useBloomreachContext } from '../../contexts/BloomreachContext'
import { DialogSize } from '@bloomreach/ui-extension-saas'
import { parseAssetFromValue } from '../../utils/assetUtils'
import styles from './FieldView.module.scss'

const { Text } = Typography

export const FieldView: React.FC = () => {
  const { ui, currentValue, mode, isDialogMode, getDialogSize } = useBloomreachContext()
  const [selectedAsset, setSelectedAsset] = useState<{
    id: string
    url: string
    alt: string
    filename: string
  } | null>(null)

  useEffect(() => {
    if (currentValue && currentValue.trim() !== '') {
      const asset = parseAssetFromValue(currentValue)
      setSelectedAsset(asset)
    } else {
      setSelectedAsset(null)
    }
  }, [currentValue])

  const handleAdd = async () => {
    if (!ui) {
      console.error('UI extension not initialized')
      return
    }

    try {
      const currentFieldValue = await ui.document.field.getValue()

      // Get dialog size from config, default to Medium
      const dialogSizeConfig = getDialogSize()
      const dialogSizeMap = {
        small: DialogSize.Small,
        medium: DialogSize.Medium,
        large: DialogSize.Large,
      } as const

      const dialogOptions = {
        title: 'Brompton Resource Space Picker',
        url: window.location.href,
        size: dialogSizeMap[dialogSizeConfig],
        value: currentFieldValue || undefined,
      }

      const selectedValue = await (ui.dialog.open(dialogOptions) as Promise<any>)
      
      if (selectedValue !== null && selectedValue !== undefined) {
        await ui.document.field.setValue(selectedValue)
        console.log('Field value set from dialog:', selectedValue)
        
        const asset = parseAssetFromValue(selectedValue)
        setSelectedAsset(asset)
      }
    } catch (err: any) {
      if (err.code === 'DialogCanceled') {
        console.log('Dialog was canceled')
      } else {
        console.error('Error opening dialog:', err.code, err.message)
      }
    }
  }

  const handleClear = async () => {
    if (!ui) {
      console.error('UI extension not initialized')
      return
    }

    if (mode !== 'edit') {
      console.warn('Cannot clear value in view or compare mode')
      return
    }

    try {
      await ui.document.field.setValue('')
      console.log('Field value cleared')
      setSelectedAsset(null)
    } catch (err: any) {
      console.error('Error clearing field value:', err.code, err.message)
    }
  }

  const hasValue = selectedAsset !== null

  useEffect(() => {
    if (ui && !isDialogMode) {
      const height = selectedAsset ? 300 : 200
      ui.document.field.setHeight(height).catch((err) => {
        console.warn('Failed to set iframe height:', err)
      })
    }
  }, [ui, isDialogMode, selectedAsset])

  return (
    <div className={styles.fieldView}>
      <Space direction="vertical" size="small">
        {selectedAsset && (
          <div className={styles.assetPreview}>
            <div className={styles.assetImageWrapper}>
              <Image
                src={selectedAsset.url}
                alt={selectedAsset.alt}
                className={styles.assetImage}
                preview={false}
                fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23ddd' width='200' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='14' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E"
              />
            </div>
            <div className={styles.assetInfo}>
              <Text strong className={styles.assetFilename}>
                {selectedAsset.filename}
              </Text>
              {selectedAsset.alt && (
                <Text type="secondary" className={styles.assetAlt}>
                  {selectedAsset.alt}
                </Text>
              )}
            </div>
          </div>
        )}
        <Space>
          <Button
            type="primary"
            icon={hasValue ? <EditOutlined /> : <PlusOutlined />}
            onClick={handleAdd}
            disabled={mode !== 'edit'}
          >
            {hasValue ? 'Edit' : 'Add'}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleClear}
            disabled={mode !== 'edit' || !hasValue}
          >
            Clear
          </Button>
        </Space>
        {mode !== 'edit' && (
          <Text type="secondary" className={styles.modeNotice}>
            Field is in {mode} mode. Editing is disabled.
          </Text>
        )}
      </Space>
    </div>
  )
}

