import React, { useState, useEffect, useRef, useCallback } from 'react'
import pintora from '@pintora/standalone'
import { stripStartEmptyLines } from '@pintora/test-shared'
import './PintoraPlay.less'

const PINTORA_LIVE_EDITOR_URL = 'https://pintorajs.netlify.app/live-editor/'

const PintoraPlay = (props) => {
  // console.log('[PintoraPlay] props', props)
  const code = stripStartEmptyLines(props.code)
  const containerRef = useRef()
  const renderer = 'svg'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!containerRef.current) return

    pintora.renderTo(code, {
      container: containerRef.current,
      renderer,
      onRender() {
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
  }, [code, renderer])

  const onOpenInEditorClick = useCallback(() => {
    const encoded = btoa(code)
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
