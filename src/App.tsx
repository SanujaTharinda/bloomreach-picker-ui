import { useEffect, useState } from 'react'
import UiExtension, { type UiScope } from '@bloomreach/ui-extension-saas'
import './App.css'

interface Image {
  id: string
  url: string
  alt: string
  mimetype?: string
  filename?: string
}

interface SerializedAttachment {
  id: string
  type: "attachments"
  attributes: Record<string, any>
  relationships: Record<string, any>
  mimetype: string
  filename: string
  cdn_url: string
}

function App() {
  const [ui, setUi] = useState<UiScope | null>(null)
  const [currentValue, setCurrentValue] = useState<string>('')
  const [mode, setMode] = useState<'view' | 'edit' | 'compare'>('view')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogMode, setIsDialogMode] = useState(false)
  const [dialogCurrentValue, setDialogCurrentValue] = useState<string>('')

  const images: Image[] = [
    {
      id: "img-1",
      url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
      alt: "Mountain landscape",
      mimetype: "image/jpeg",
      filename: "mountain-landscape.jpg"
    },
    {
      id: "img-2",
      url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
      alt: "Forest road",
      mimetype: "image/jpeg",
      filename: "forest-road.jpg"
    }
  ];

  const serializeImage = (img: Image): SerializedAttachment => {
    // Extract filename from URL if not provided
    const filename = img.filename || img.url.split('/').pop() || 'image.jpg'
    // Extract mimetype from filename or default to image/jpeg
    const mimetype = img.mimetype || (filename.endsWith('.png') ? 'image/png' : 'image/jpeg')
    
    return {
      id: img.id,
      type: "attachments",
      attributes: {
        alt: img.alt,
        url: img.url
      },
      relationships: {},
      mimetype,
      filename,
      cdn_url: img.url
    }
  }

  useEffect(() => {
    const initializeExtension = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        // Register the UI extension
        const extension = await UiExtension.register()
        setUi(extension)

        // Check if we're in dialog mode by trying to get dialog options
        try {
          const dialogOptions = await extension.dialog.options()
          setIsDialogMode(true)
          setDialogCurrentValue(dialogOptions.value || '')
          // In dialog mode, we don't need document/field info
        } catch (dialogErr: any) {
          // Not in dialog mode, proceed with normal initialization
          setIsDialogMode(false)
          
          // Get document information
          const document = await extension.document.get()
          setMode(document.mode)

          // Get current field value
          const value = await extension.document.field.getValue()
          setCurrentValue(value || '')

          // Set initial height for the iframe
          await extension.document.field.setHeight(400)
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

  const selectImage = async (img: Image) => {
    if (!ui) {
      console.error('UI extension not initialized')
      return
    }

    try {
      // Serialize the image into the required format
      const serialized = serializeImage(img)
      const serializedValue = JSON.stringify([serialized])
      
      if (isDialogMode) {
        // In dialog mode, close the dialog and return the value
        await ui.dialog.close(serializedValue)
        console.log('Dialog closed with value:', serializedValue)
      } else {
        // In main mode, check if we're in edit mode
        if (mode !== 'edit') {
          console.warn('Cannot set value in view or compare mode')
          return
        }
        
        // Set the field value using the UI Extension API
        await ui.document.field.setValue(serializedValue)
        setCurrentValue(serializedValue)
        console.log('Successfully set field value:', serializedValue)
      }
    } catch (err: any) {
      console.error('Error setting field value:', err.code, err.message)
      setError(`Failed to set value: ${err.message}`)
    }
  }

  const openDialog = async () => {
    if (!ui) {
      console.error('UI extension not initialized')
      return
    }

    if (mode !== 'edit') {
      console.warn('Cannot open dialog in view or compare mode')
      return
    }

    try {
      // Get current value to pass to dialog
      const curValue = await ui.document.field.getValue()
      
      // Use the current URL for the dialog (relative or absolute)
      // The dialog mode will be detected via ui.dialog.options()
      const dialogUrl = window.location.href
      
      const dialogOptions: any = {
        title: 'Select Image',
        url: dialogUrl,
        size: 'medium',
        value: curValue || '',
      }
      
      const response = await ui.dialog.open(dialogOptions) as unknown as string
      
      // Set the field value with the response from dialog
      // Response is the value passed to dialog.close() which is a string
      if (response) {
        await ui.document.field.setValue(response)
        setCurrentValue(response)
        console.log('Successfully set field value from dialog:', response)
      }
    } catch (err: any) {
      if (err.code === 'DialogCanceled') {
        console.log('Dialog was canceled')
        return
      }
      console.error('Error opening dialog:', err.code, err.message)
      setError(`Failed to open dialog: ${err.message}`)
    }
  }

  // Helper function to check if an image is selected
  const isImageSelected = (img: Image, valueToCheck: string): boolean => {
    if (!valueToCheck) return false
    
    try {
      const parsed = JSON.parse(valueToCheck)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0].id === img.id || parsed[0].cdn_url === img.url
      } else if (typeof parsed === 'string') {
        // Fallback for old format (just URL)
        return parsed === img.url
      }
    } catch {
      // If parsing fails, fallback to string comparison
      return valueToCheck === img.url
    }
    return false
  }

  if (isLoading) {
    return (
      <div>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    )
  }

  // Dialog mode - show image picker
  if (isDialogMode) {
    return (
      <div style={{ padding: '1rem' }}>
        {dialogCurrentValue && (
          <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
            <strong>Current value:</strong> {dialogCurrentValue}
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {images.map(img => {
            const isSelected = isImageSelected(img, dialogCurrentValue)
            
            return (
              <div
                key={img.id}
                style={{
                  border: isSelected ? '2px solid #007bff' : '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => selectImage(img)}
                title="Click to select"
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  style={{ 
                    width: 200, 
                    height: 150,
                    objectFit: 'cover',
                    borderRadius: '4px',
                    display: 'block'
                  }}
                />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>{img.alt}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Main mode - show button to open dialog
  return (
    <div>
      {currentValue && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <strong>Current value:</strong> {currentValue}
        </div>
      )}
      
      {mode === 'edit' ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <button
            onClick={openDialog}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
          >
            Open Image Picker
          </button>
        </div>
      ) : (
        <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.875rem', textAlign: 'center' }}>
          Note: Edit mode is required to update the field value
        </p>
      )}
    </div>
  )
}

export default App
