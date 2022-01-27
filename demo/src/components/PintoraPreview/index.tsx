import React, { useState, useEffect, useRef } from 'react'
import { RenderOptions } from '@pintora/renderer'
import pintora from '@pintora/standalone'
import './PintoraPreview.less'

interface Props {
  code: string
  renderer?: RenderOptions['renderer']
  pintoraConfig?: any
  onError?(error: Error): void
  onSuccess?(): void
}

export default function PintoraPreview(props: Props) {
  const { code, renderer, pintoraConfig, onError, onSuccess } = props
  const containerRef = useRef<HTMLDivElement>()
  const [errorMessage, setErrorMessage] = useState<string | null>('')

  useEffect(() => {
    if (!containerRef.current) return

    pintora.renderTo(code, {
      container: containerRef.current,
      config: pintoraConfig,
      renderer,
      // enhanceGraphicIR(ir) {
      //   const backgroundColor = '#282a36'
      //   if (backgroundColor && !ir.bgColor) ir.bgColor = backgroundColor
      //   return ir
      // },
      onRender(renderer: unknown) {
        ;(window as any).pintoraRenderer = renderer
        setErrorMessage(null)
        if (onSuccess) onSuccess()
      },
      onError(error) {
        console.error(error)
        setErrorMessage(error.stack || error.message)
        if (onError) onError(error)
      },
    })

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [code, renderer, pintoraConfig])

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
