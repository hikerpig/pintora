import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react'
import useThemeContext from '@theme/hooks/useThemeContext';
import pintora from '@pintora/standalone'
import { stripStartEmptyLines } from '@pintora/test-shared'
import { PINTORA_LIVE_EDITOR_URL } from '../../../../src/const'
import './PintoraPlay.less'

const PintoraPlay = (props) => {
  // console.log('[PintoraPlay] props', props)
  const code = stripStartEmptyLines(props.code)
  const containerRef = useRef<HTMLDivElement>()
  const renderer = 'svg'
  const [errorMessage, setErrorMessage] = useState('')
  const {isDarkTheme} = useThemeContext();

  useEffect(() => {
    if (!containerRef.current) return

    pintora.setConfig({
      core: {
        theme: isDarkTheme ? 'dark': 'default'
      }
    } as any)

    pintora.renderTo(code, {
      container: containerRef.current,
      renderer,
      onRender(renderer: any) {
        try {
          const irWidth = renderer.ir.width
          const containerWidth = containerRef.current.clientWidth
          if (irWidth > containerWidth) {
            const element: SVGSVGElement | HTMLCanvasElement = renderer.gcvs.getCanvas().cfg.el
            if (element) {
              const scale = containerWidth / irWidth
              element.style.transform = `scale(${scale})`
              element.style.transformOrigin = 'top left'
            }
          }
        } catch (error) {
          console.error('error during resizing g canvas element', error)
        }

        setErrorMessage(null)
      },
      onError(error) {
        console.error(error)
        setErrorMessage(error.stack || error.message)
      },
    })

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [code, renderer, isDarkTheme])

  const onOpenInEditorClick = useCallback(() => {
    // const encoded = encodeURIComponent(btoa(escape(code)))
    const encoded = pintora.util.encodeForUrl(code)
    const url = `${PINTORA_LIVE_EDITOR_URL}?code=${encoded}`
    window.open(url, '_blank')
  }, [code])

  return (
    <div className="PintoraPlay">
      <div className="PintoraPlay__code-wrap">
        <pre>{code}</pre>
        <button onClick={onOpenInEditorClick} className="PintoraPlay__float-button">Open in Live Editor</button>
      </div>
      {errorMessage && (
        <div className="DintoraPreview__error">
          <pre>{errorMessage}</pre>
        </div>
      )}
      <div ref={containerRef}></div>
    </div>
  )
}

export default PintoraPlay
