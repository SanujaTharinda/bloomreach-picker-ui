import { useEffect, useState } from 'react'
import UiExtension, { type UiScope } from '@bloomreach/ui-extension-saas'
import type { UseBloomreachExtensionReturn } from '../types'
import { isLocalDevelopment, mockUiExtensionRegister } from '../utils/bloomreachMock'

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

        // Check if we're in local development mode first
        const isLocal = isLocalDevelopment()
        
        // Use mock in local development, real API in Bloomreach
        let extension: UiScope
        
        if (isLocal) {
          // Get config from URL params for local testing
          const urlParams = new URLSearchParams(window.location.search)
          extension = await mockUiExtensionRegister({
            apiKey: urlParams.get('apiKey') || undefined,
            mode: (urlParams.get('mode') as 'view' | 'edit' | 'compare') || 'edit',
            currentValue: urlParams.get('value') || undefined,
            isDialogMode: urlParams.get('dialog') === 'true',
            dialogValue: urlParams.get('dialogValue') || undefined,
          })
        } else {
          // Only call real API when actually in Bloomreach iframe
          extension = await UiExtension.register()
        }

        setUi(extension)

        // Check if we're in dialog mode
        try {
          const dialogOptions = await extension.dialog.options()
          setIsDialogMode(true)
          setDialogCurrentValue(dialogOptions.value || '')
        } catch (dialogErr: any) {
          // Not in dialog mode
          setIsDialogMode(false)

          // Get document information
          const document = await extension.document.get()
          setMode(document.mode)

          // Get current field value
          const value = await extension.document.field.getValue()
          setCurrentValue(value || '')

          // Set initial height for the iframe
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

  return {
    ui,
    currentValue,
    mode,
    isDialogMode,
    dialogCurrentValue,
    isLoading,
    error,
  }
}
