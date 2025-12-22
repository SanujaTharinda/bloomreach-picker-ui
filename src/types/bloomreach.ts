/**
 * Bloomreach UI Extension types
 */

import type { UiScope } from '@bloomreach/ui-extension-saas'

export interface BloomreachContextValue {
  ui: UiScope | null
  currentValue: string
  mode: 'view' | 'edit' | 'compare'
  isDialogMode: boolean
  dialogCurrentValue: string
  isLoading: boolean
  error: string | null
  getApiKey: () => string | null
}

export type DocumentEditorMode = 'view' | 'edit' | 'compare'

