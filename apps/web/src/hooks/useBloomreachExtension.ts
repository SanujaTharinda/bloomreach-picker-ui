import { useEffect, useState, useCallback } from 'react'
import UiExtension, { type UiScope } from '@bloomreach/ui-extension-saas'
import type { UseBloomreachExtensionReturn, ExtensionConfig } from '../types'
import { isLocalDevelopment, mockUiExtensionRegister } from '../utils/bloomreachMock'

/**
 * Get API key from Bloomreach Custom Integration configuration
 * The configuration is stored in ui.extension.config as a JSON string
 */
const getApiKeyFromConfig = (ui: UiScope | null): string | null => {
  if (!ui) {
    return null
  }

  try {
    const config: ExtensionConfig = JSON.parse(ui.extension.config || '{}');
    return config.apiKey || null;
  } catch (error) {
    console.error('Failed to parse extension configuration:', error)
    return ui.extension.config || null
  }
}

/**
 * Get dialog size from Bloomreach Custom Integration configuration
 * The configuration is stored in ui.extension.config as a JSON string
 * Defaults to 'medium' if not specified
 */
const getDialogSizeFromConfig = (ui: UiScope | null): 'small' | 'medium' | 'large' => {
  if (!ui) {
    return 'medium'
  }

  try {
    const config: ExtensionConfig = JSON.parse(ui.extension.config || '{}');
    const dialogSize = config.dialogSize;
    if (dialogSize === 'small' || dialogSize === 'medium' || dialogSize === 'large') {
      return dialogSize;
    }
    return 'medium';
  } catch (error) {
    console.error('Failed to parse extension configuration:', error)
    return 'medium'
  }
}

export const useBloomreachExtension = (): UseBloomreachExtensionReturn => {
  const [ui, setUi] = useState<UiScope | null>(null)
  const [currentValue, setCurrentValue] = useState<string>('')
  const [mode, setMode] = useState<'view' | 'edit' | 'compare'>('view')
  const [isDialogMode, setIsDialogMode] = useState(false)
  const [dialogCurrentValue, setDialogCurrentValue] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const initializeExtension = async () => {
      try {
        setIsLoading(true)
        setError('')

        const isLocal = isLocalDevelopment()
        
        let extension: UiScope
        
        if (isLocal) {
          const urlParams = new URLSearchParams(window.location.search)
          const modeParam = urlParams.get('mode')
          let mode: 'view' | 'edit' | 'compare' | undefined = undefined
          if (modeParam === 'view' || modeParam === 'edit' || modeParam === 'compare') {
            mode = modeParam
          }
          const dialogSizeParam = urlParams.get('dialogSize')
          const dialogSize: 'small' | 'medium' | 'large' | undefined = 
            (dialogSizeParam === 'small' || dialogSizeParam === 'medium' || dialogSizeParam === 'large') 
              ? dialogSizeParam 
              : undefined
          extension = await mockUiExtensionRegister({
            apiKey: urlParams.get('apiKey') || undefined,
            // @ts-expect-error - Mock implementation, mode type is compatible at runtime
            mode: mode,
            currentValue: urlParams.get('value') || undefined,
            isDialogMode: urlParams.get('dialog') === 'true',
            dialogValue: urlParams.get('dialogValue') || undefined,
            dialogSize: dialogSize,
          })
        } else {
          extension = await UiExtension.register();
        }

        setUi(extension)

        try {
          const dialogOptions = await extension.dialog.options()
          console.log('[Bloomreach] Dialog mode detected:', dialogOptions)
          setIsDialogMode(true)
          setDialogCurrentValue(dialogOptions.value || '')
        } catch (dialogErr: any) {
          console.log('[Bloomreach] Not in dialog mode, using document field mode')
          console.log('[Bloomreach] Dialog error (expected if not configured as dialog):', dialogErr?.message || dialogErr)
          setIsDialogMode(false)

          const document = await extension.document.get()
          setMode(document.mode)

          const value = await extension.document.field.getValue()
          setCurrentValue(value || '')

          await extension.document.field.setHeight(600)
        }
      } catch (err: any) {
        console.error('Failed to register extension:', err.message)
        console.error('- error code:', err.code)
        setError(`Failed to initialize: ${err.message}`)
      } finally {
        setIsLoading(false)
      }
    }

    initializeExtension()
  }, [])

  const getApiKey = useCallback((): string | null => getApiKeyFromConfig(ui), [ui]);
  const getDialogSize = useCallback((): 'small' | 'medium' | 'large' => getDialogSizeFromConfig(ui), [ui]);

  return {
    ui,
    currentValue,
    mode,
    isDialogMode,
    dialogCurrentValue,
    isLoading,
    error,
    getApiKey,
    getDialogSize
  }
}
