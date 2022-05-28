import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import pintora from '@pintora/standalone'
import PintoraPreview from 'src/components/PintoraPreview'
import './index.less'

const App = () => {
  const [pintoraCode, setPintoraCode] = useState('')
  const [pintoraRenderer, setPintoraRenderer] = useState<any>('svg')

  useEffect(() => {
    // attach pintora to global scope
    window.pintora = pintora

    const params = new URLSearchParams(location.search)

    const encodedConfig = params.get('config')
    let pintoraConfig
    if (encodedConfig) {
      try {
        pintoraConfig = JSON.parse(pintora.util.decodeCodeInUrl(encodedConfig))
        pintora.setConfig(pintoraConfig)
      } catch (error) {
        console.error('[preview] error when processing config in url', error)
      }
    }

    let code = ''
    const encodedCode = params.get('code')
    if (encodedCode) {
      try {
        code = pintora.util.decodeCodeInUrl(encodedCode)
      } catch (error) {
        console.error('[preview] error when decoding code in url', error)
      }
      const newParams = new URLSearchParams(params)
      newParams.delete('code')
    }

    if (code) {
      setPintoraCode(code)
    }

    const renderer = params.get('renderer')
    if (renderer) {
      setPintoraRenderer(renderer)
    }
  }, [])

  return (
    <div className="preview">
      <PintoraPreview code={pintoraCode} renderer={pintoraRenderer} />
    </div>
  )
}

function start() {
  const container = document.getElementById('root')
  if (container) {
    const root = createRoot(container)
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  }
}

// start after fonts are loaded
if (/e2e=true/.test(location.search)) {
  console.log('in e2e test, wait till fonts are loaded')
  document.body.style.fontFamily = "'Source Code Pro', sans-serif"

  const fontToBeTested = '12px Source Code Pro'
  document.fonts.load(fontToBeTested, 'essential font').then(() => {
    const loaded = document.fonts.check(fontToBeTested)
    console.log('font loaded', loaded)
    start()
  })
} else {
  start()
}
