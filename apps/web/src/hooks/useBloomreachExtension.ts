import { useEffect, useState, useCallback } from 'react'
import UiExtension, { type UiScope, DocumentEditorMode, DialogSize } from '@bloomreach/ui-extension-saas'
import type { UseBloomreachExtensionReturn, ExtensionConfig, AssetRecord } from '../types'
import { isLocalDevelopment, mockUiExtensionRegister } from '../utils/bloomreachMock'
import { parseAssetFromValue } from '../utils/assetUtils'

const getApiKeyFromConfig = (ui: UiScope | null): string | null => {
  if (!ui) return null

  try {
    const config: ExtensionConfig = JSON.parse(ui.extension.config || '{}')
    return config.apiKey || null
  } catch {
    return ui.extension.config || null
  }
}

const getDialogSizeFromConfig = (ui: UiScope | null): DialogSize => {
  if (!ui) return DialogSize.Large

  try {
    const config: ExtensionConfig = JSON.parse(ui.extension.config || '{}')
    const dialogSize = config.dialogSize
    if (Object.values(DialogSize).includes(dialogSize as DialogSize))
      return dialogSize as DialogSize

    return DialogSize.Large
  } catch {
    return DialogSize.Large
  }
}

export const useBloomreachExtension = (): UseBloomreachExtensionReturn => {
  const [ui, setUi] = useState<UiScope | null>(null)
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null)
  const [mode, setMode] = useState<DocumentEditorMode>(DocumentEditorMode.View)
  const [isDialogMode, setIsDialogMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const initializeExtension = async () => {
      try {
        setIsLoading(true)
        setError('')

        let extension: UiScope

        if (isLocalDevelopment()) {
          const urlParams = new URLSearchParams(window.location.search)

          const modeParam = urlParams.get('mode')
          const parsedMode = Object.values(DocumentEditorMode).includes(modeParam as DocumentEditorMode)
            ? (modeParam as DocumentEditorMode)
            : undefined

          const dialogSizeParam = urlParams.get('dialogSize')
          const dialogSize = Object.values(DialogSize).includes(dialogSizeParam as DialogSize)
            ? (dialogSizeParam as DialogSize)
            : undefined

          extension = await mockUiExtensionRegister({
            apiKey: urlParams.get('apiKey') || undefined,
            mode: parsedMode,
            fieldValue: urlParams.get('value') || undefined,
            isDialogMode: urlParams.get('dialog') === 'true',
            dialogValue: urlParams.get('dialogValue') || undefined,
            dialogSize,
          })
        } else {
          extension = await UiExtension.register()
        }

        setUi(extension)

        try {
          const dialogOptions = await extension.dialog.options()
          setIsDialogMode(true)
          const initialAsset = parseAssetFromValue(dialogOptions.value || '')
          setSelectedAsset(initialAsset)
        } catch {
          setIsDialogMode(false)

          const document = await extension.document.get()
          setMode(document.mode)

          const fieldValue = await extension.document.field.getValue()
          // Parse initial asset from field value
          const initialAsset = parseAssetFromValue(fieldValue || '')
          setSelectedAsset(initialAsset)

          await extension.document.field.setHeight(600)
        }
      } catch (err) {
        const error = err as { message?: string }
        console.error('Failed to register extension:', error.message)
        setError(`Failed to initialize: ${error.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    initializeExtension()
  }, [])

  const getApiKey = useCallback((): string | null => getApiKeyFromConfig(ui), [ui])
  const getDialogSize = useCallback((): DialogSize => getDialogSizeFromConfig(ui), [ui])

  return {
    ui,
    selectedAsset,
    setSelectedAsset,
    mode,
    isDialogMode,
    isLoading,
    error,
    getApiKey,
    getDialogSize,
  }
}
