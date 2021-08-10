import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'
import pintora from '@pintora/standalone'
import PintoraPreview from 'src/components/PintoraPreview'
import './index.less'

const App = () => {
  const [pintoraCode, setPintoraCode] = useState('');

  useEffect(() => {
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

    let code: string = ''
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
  }, [])
  
  return <div className="preview">
    <PintoraPreview code={pintoraCode} />
  </div>
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)
