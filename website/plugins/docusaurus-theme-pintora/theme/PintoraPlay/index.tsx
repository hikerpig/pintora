import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useColorMode } from '@docusaurus/theme-common'
import pintora from '@pintora/standalone'
import { PINTORA_LIVE_EDITOR_URL } from '../../../../src/const'
import { startShiki, shikiLightTheme, shikiDarkTheme } from './highlight'
import './PintoraPlay.less'

const PintoraPlay = props => {
  // console.log('[PintoraPlay] props', props)
  const code = props.code
  const containerRef = useRef<HTMLDivElement>()
  const renderer = 'svg'
  const [errorMessage, setErrorMessage] = useState('')
  const [highlightedCode, setHighlightedCode] = useState('')
  let isDarkTheme = false
  try {
    isDarkTheme = useColorMode().colorMode === 'dark'
  } catch (error) {
    // if this component is not child of <Layout>, useColorMode will throw error
    // https://docusaurus.io/docs/api/themes/configuration#use-color-mode
  }

  useEffect(() => {
    if (!containerRef.current) return

    pintora.setConfig({
      themeConfig: {
        theme: isDarkTheme ? 'dark' : 'default',
      },
    })

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
  }, [code, isDarkTheme])

  useEffect(() => {
    startShiki({ isDarkMode: isDarkTheme }).then(({ highlighter }) => {
      try {
        const shikiTheme = isDarkTheme ? shikiDarkTheme : shikiLightTheme
        const html = highlighter.codeToHtml(code, { lang: 'pintora', theme: shikiTheme })
        setHighlightedCode(html)
      } catch (error) {
        console.warn('error in highlighting pintora DSL')
      }
    })
  }, [code, isDarkTheme])

  return (
    <div className="PintoraPlay">
      <div className="PintoraPlay__code-wrap">
        {highlightedCode ? <div dangerouslySetInnerHTML={{ __html: highlightedCode }}></div> : <pre>{code}</pre>}
        <button onClick={onOpenInEditorClick} className="PintoraPlay__float-button">
          Open in Live Editor
        </button>
      </div>
      {errorMessage && (
        <div className="PintoraPreview__error">
          <pre>{errorMessage}</pre>
        </div>
      )}
      <div className="PintoraPlay__preview" ref={containerRef}></div>
    </div>
  )
}

export default PintoraPlay
