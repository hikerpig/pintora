import * as React from 'react'
import { DEMO_BASE_URL, GITHUB_URL, DOC_URL } from '../../const'
import './Header.css'

const LIVE_EDITOR_URL = `${DEMO_BASE_URL}live-editor/`

function getPublicUrl(p: string) {
  return `${DEMO_BASE_URL}/${p.replace(/^\//, '')}`
}

export default function Header() {
  return (
    <div className="Header flex justify-between px-3 py-3 shadow">
      <div>
        <a href={LIVE_EDITOR_URL} className="Header__brand flex items-center">
          <img src={getPublicUrl('/img/logo.svg')} alt="Logo" className="Header__logo" />
          Pintora Live Editor
        </a>
      </div>
      <div className="flex">
        <a href={DOC_URL} className="Header__link">
          Documentation
        </a>
        <a href={GITHUB_URL} className="Header__link">
          Github
        </a>
      </div>
    </div>
  )
}
