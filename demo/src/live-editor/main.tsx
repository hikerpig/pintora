import { stripStartEmptyLines } from '@pintora/test-shared'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { isProd } from '../env'
import './pwa'
import './index.css'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

function addAd() {
  window.addEventListener('load', () => {
    const script = document.createElement('script')
    script.async = true
    script.type = 'text/javascript'
    script.src = '//cdn.carbonads.com/carbon.js?serve=CEADPK77&placement=pintorajsvercelapp'
    script.id = '_carbonads_js'
    document.body.appendChild(script)

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/style/carbon.css' // is hosted in website static/style
    // link.href = 'http://localhost:3000/style/carbon.css'
    document.body.appendChild(link)

    const style = document.createElement('style')
    style.innerHTML = stripStartEmptyLines(`
    #carbonads {
      bottom: 5px;
    }
    `)
    document.body.appendChild(style)
  })
}

if (isProd) {
  addAd()
}
