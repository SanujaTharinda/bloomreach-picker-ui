/**
 * Mock implementation of Bloomreach UI Extension API for local development
 */

import type { UiScope, DocumentEditorMode } from '@bloomreach/ui-extension-saas'
import { UiStyling, DialogSize } from '@bloomreach/ui-extension-saas'

interface MockUiScope extends UiScope {
  _mockConfig?: {
    apiKey?: string
    mode?: DocumentEditorMode
    currentValue?: string
    isDialogMode?: boolean
    dialogValue?: string
  }
}

/**
 * Check if we're running in local development mode (not in Bloomreach iframe)
 */
export const isLocalDevelopment = (): boolean => {
  try {
    // Check if we're in an iframe (Bloomreach loads extensions in iframes)
    const inIframe = window.self !== window.top
    
    // Check for local dev flag in URL or localStorage
    const urlParams = new URLSearchParams(window.location.search)
    const localDev = urlParams.get('localDev') === 'true' || localStorage.getItem('bloomreach:localDev') === 'true'
    
    // Always use mock if explicitly set, otherwise use mock if not in iframe
    // (Bloomreach always loads extensions in iframes, so if we're not in one, we're local)
    const isLocal = localDev || !inIframe
    
    if (isLocal) {
      console.log('[Local Dev] Running in mock mode', { inIframe, localDev })
    }
    
    return isLocal
  } catch (error) {
    // If we can't determine, assume local dev to be safe
    console.warn('[Local Dev] Error checking environment, defaulting to mock mode', error)
    return true
  }
}

/**
 * Create a mock UiScope for local development
 */
export const createMockUiScope = (config?: {
  apiKey?: string
  mode?: DocumentEditorMode
  currentValue?: string
  isDialogMode?: boolean
  dialogValue?: string
}): MockUiScope => {
  const mockConfig = {
    apiKey: config?.apiKey || 'mock-api-key-12345',
    mode: (config?.mode || 'edit') as DocumentEditorMode,
    currentValue: config?.currentValue || '',
    isDialogMode: config?.isDialogMode || false,
    dialogValue: config?.dialogValue || '',
  }

  // Store field value in memory for mock
  let fieldValue = mockConfig.currentValue
  
  // Store dialog promise resolver for mock dialog.open()
  let dialogResolver: ((value: any) => void) | null = null
  let dialogRejector: ((error: any) => void) | null = null

  const mockScope: MockUiScope = {
    baseUrl: window.location.origin,
    extension: {
      config: JSON.stringify({ apiKey: mockConfig.apiKey }),
    },
    locale: 'en',
    styling: UiStyling.Material,
    timeZone: 'UTC',
    user: {
      id: 'mock-user',
      firstName: 'Mock',
      lastName: 'User',
      displayName: 'Mock User',
    },
    version: '14.0.0',
    channel: {
      page: {
        get: async () => ({
          id: 'mock-page-id',
          url: window.location.href,
          channel: {
            id: 'mock-channel',
            contextPath: '/',
            mountPath: '',
          },
          sitemapItem: {
            id: 'mock-sitemap-item',
          },
          path: '/',
        }),
        refresh: async () => {},
        on: () => () => {},
      },
      get: async () => ({}),
      refresh: async () => {},
      on: () => () => {},
    },
    document: {
      get: async () => ({
        id: 'mock-document-id',
        displayName: 'Mock Document',
        locale: 'en',
        mode: (mockConfig.mode || 'edit') as DocumentEditorMode,
        urlName: 'mock-document',
        variant: {
          id: 'draft',
        },
      }),
      navigate: async () => {},
      open: async () => {},
      field: {
        getValue: async () => fieldValue,
        getCompareValue: async () => '',
        setValue: async (value: string) => {
          fieldValue = value
          console.log('[Mock] Field value set:', value)
        },
        setHeight: async () => {
          console.log('[Mock] Iframe height set')
        },
      },
      setFieldValue: async () => {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock implementation, returns null for simplicity but type expects string
      getFieldValue: async (): Promise<string> => null as any,
      getValues: async () => ({}),
    },
    dialog: {
      options: async () => {
        if (mockConfig.isDialogMode) {
          return {
            title: 'Select Asset',
            url: window.location.href,
            size: DialogSize.Medium,
            value: mockConfig.dialogValue || '',
          }
        }
        throw new Error('Not in dialog mode')
      },
      open: async (options: any) => {
        console.log('[Mock] Dialog opened with options:', options)
        
        // In local development, open the dialog URL in a new window
        // Add dialog=true parameter to simulate dialog mode
        const dialogUrl = new URL(options.url || window.location.href)
        
        // Preserve existing query parameters
        const currentParams = new URLSearchParams(window.location.search)
        currentParams.forEach((value, key) => {
          if (key !== 'dialog' && key !== 'dialogValue') {
            dialogUrl.searchParams.set(key, value)
          }
        })
        
        // Set dialog mode parameters
        dialogUrl.searchParams.set('dialog', 'true')
        if (options.value) {
          dialogUrl.searchParams.set('dialogValue', typeof options.value === 'string' ? options.value : JSON.stringify(options.value))
        }
        
        // Open in a new window for local development
        const dialogWindow = window.open(
          dialogUrl.toString(),
          'bloomreach-dialog',
          'width=800,height=600,resizable=yes,scrollbars=yes'
        )
        
        if (!dialogWindow) {
          const error = new Error('Failed to open dialog window. Please allow popups for this site.')
          // @ts-expect-error - Adding code property to match UiExtensionError
          error.code = 'InternalError'
          throw error
        }
        
        // Return a promise that resolves when dialog.close() or dialog.cancel() is called
        // Listen for messages from the dialog window
        const messageHandler = (event: MessageEvent) => {
          // Only accept messages from the same origin
          if (event.origin !== window.location.origin) {
            return
          }
          
          if (event.data?.type === 'bloomreach-dialog-close') {
            window.removeEventListener('message', messageHandler)
            if (dialogWindow && !dialogWindow.closed) {
              dialogWindow.close()
            }
            if (dialogResolver) {
              dialogResolver(event.data.value)
              dialogResolver = null
              dialogRejector = null
            }
          } else if (event.data?.type === 'bloomreach-dialog-cancel') {
            window.removeEventListener('message', messageHandler)
            if (dialogWindow && !dialogWindow.closed) {
              dialogWindow.close()
            }
            if (dialogRejector) {
              const error = new Error('Dialog canceled')
              // @ts-expect-error - Adding code property to match UiExtensionError
              error.code = 'DialogCanceled'
              dialogRejector(error)
              dialogResolver = null
              dialogRejector = null
            }
          }
        }
        
        // Also handle window closed manually
        const checkClosed = setInterval(() => {
          if (dialogWindow.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', messageHandler)
            if (dialogRejector) {
              const error = new Error('Dialog canceled')
              // @ts-expect-error - Adding code property to match UiExtensionError
              error.code = 'DialogCanceled'
              dialogRejector(error)
              dialogResolver = null
              dialogRejector = null
            }
          }
        }, 500)
        
        window.addEventListener('message', messageHandler)
        
        return new Promise((resolve, reject) => {
          dialogResolver = resolve
          dialogRejector = reject
        })
      },
      close: async (value: any) => {
        console.log('[Mock] Dialog closed with value:', value)
        
        // If we're in a dialog window (opened by dialog.open), send message to parent
        if (mockConfig.isDialogMode && window.opener) {
          window.opener.postMessage({
            type: 'bloomreach-dialog-close',
            value: value,
          }, window.location.origin)
          // Close the dialog window
          window.close()
          return
        }
        
        // Otherwise, resolve the promise directly (for direct calls)
        if (dialogResolver) {
          dialogResolver(value)
          dialogResolver = null
          dialogRejector = null
        }
      },
      cancel: async () => {
        console.log('[Mock] Dialog canceled')
        
        // If we're in a dialog window (opened by dialog.open), send message to parent
        if (mockConfig.isDialogMode && window.opener) {
          window.opener.postMessage({
            type: 'bloomreach-dialog-cancel',
          }, window.location.origin)
          // Close the dialog window
          window.close()
          return
        }
        
        // Otherwise, reject the promise directly (for direct calls)
        if (dialogRejector) {
          const error = new Error('Dialog canceled')
          // @ts-expect-error - Adding code property to match UiExtensionError
          error.code = 'DialogCanceled'
          dialogRejector(error)
          dialogResolver = null
          dialogRejector = null
        }
      },
    },
    _mockConfig: mockConfig,
  }

  return mockScope
}

/**
 * Mock UiExtension.register() for local development
 */
export const mockUiExtensionRegister = async (config?: {
  apiKey?: string
  mode?: DocumentEditorMode
  currentValue?: string
  isDialogMode?: boolean
  dialogValue?: string
}): Promise<UiScope> => {
  // Simulate async registration delay
  await new Promise((resolve) => setTimeout(resolve, 100))
  
  return createMockUiScope(config)
}

