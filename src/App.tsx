import { useEffect, useState } from 'react'
import UiExtension, { type UiScope } from '@bloomreach/ui-extension-saas'
import './App.css'

interface Image {
  id: string
  url: string
  alt: string
}

function App() {
  const [ui, setUi] = useState<UiScope | null>(null)
  const [currentValue, setCurrentValue] = useState<string>('')
  const [mode, setMode] = useState<'view' | 'edit' | 'compare'>('view')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  const images: Image[] = [
    {
      id: "img-1",
      url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
      alt: "Mountain landscape"
    },
    {
      id: "img-2",
      url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
      alt: "Forest road"
    }
  ];

  useEffect(() => {
    const initializeExtension = async () => {
      try {
        setIsLoading(true)
        setError('')
        
        // Register the UI extension
        const extension = await UiExtension.register()
        setUi(extension)

        // Get document information
        const document = await extension.document.get()
        setMode(document.mode)

        // Get current field value
        const value = await extension.document.field.getValue()
        setCurrentValue(value || '')

        // Set initial height for the iframe
        await extension.document.field.setHeight(400)
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

    if (mode !== 'edit') {
      console.warn('Cannot set value in view or compare mode')
      return
    }

    try {
      // Set the field value using the UI Extension API
      await ui.document.field.setValue(img.url)
      setCurrentValue(img.url)
      console.log('Successfully set field value:', img.url)
    } catch (err: any) {
      console.error('Error setting field value:', err.code, err.message)
      setError(`Failed to set value: ${err.message}`)
    }
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

  return (
    <div>
      {currentValue && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <strong>Current value:</strong> {currentValue}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {images.map(img => (
          <div
            key={img.id}
            style={{
              border: currentValue === img.url ? '2px solid #007bff' : '1px solid #ddd',
              borderRadius: '8px',
              padding: '0.5rem',
              cursor: mode === 'edit' ? 'pointer' : 'default',
              opacity: mode === 'edit' ? 1 : 0.6,
              transition: 'all 0.2s'
            }}
            onClick={() => selectImage(img)}
            title={mode === 'edit' ? 'Click to select' : 'Edit mode required'}
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
        ))}
      </div>
      
      {mode !== 'edit' && (
        <p style={{ marginTop: '1rem', color: '#666', fontSize: '0.875rem' }}>
          Note: Edit mode is required to update the field value
        </p>
      )}
    </div>
  )
}

export default App
