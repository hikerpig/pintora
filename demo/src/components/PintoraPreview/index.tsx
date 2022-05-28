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
  const [fontReady, setFontReady] = useState(false)

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
      // an example for @pintora/standalone's eventsHandlers option
      eventsHandlers: {
        click(diagramEvent) {
          console.log('diagramEvent, click', diagramEvent)
        },
      },
    })

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [code, renderer, pintoraConfig, fontReady])

  useEffect(() => {
    const fontFamily = 'Source Code Pro'
    const fontToBeTested = `12px ${fontFamily}`
    if (document.fonts) {
      document.fonts.load(fontToBeTested, 'essential font').then(() => {
        const loaded = document.fonts.check(fontToBeTested)
        // refresh the preview once font is ready
        setFontReady(loaded)
      })
    }
  }, [])

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
