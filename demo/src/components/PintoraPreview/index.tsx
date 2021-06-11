import React, { useState, useEffect, useRef } from 'react'
import { RenderOptions } from '@pintora/renderer'
import pintora from '@pintora/standalone'
import './PintoraPreview.less'

interface Props {
  code: string
  renderer?: RenderOptions['renderer']
  onError?(error: Error): void
}

export default function PintoraPreview(props: Props) {
  const { code, renderer, onError } = props
  const containerRef = useRef<HTMLDivElement>()
  const [errorMessage, setErrorMessage] = useState<string | null>('')

  useEffect(() => {
    if (!containerRef.current) return

    pintora.renderTo(code, {
      container: containerRef.current,
      renderer,
      onRender(renderer: any) {
        ;(window as any).pintoraRenderer = renderer
        setErrorMessage(null)
      },
      onError(error) {
        setErrorMessage(error.message)
      },
    })

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [code, renderer])

  return (
    <div className="PintoraPreview">
      {errorMessage && (
        <div className="PintoraPreview__error">
          <pre>{errorMessage}</pre>
        </div>
      )}
      <div className="PintoraPreview__figure-container" ref={containerRef as any}></div>
    </div>
  )
}
