import * as React from 'react'
import { DEMO_BASE_URL, GITHUB_URL, DOC_URL } from '../../const'
import { useDarkMode } from 'usehooks-ts'
import './Header.css'

const LIVE_EDITOR_URL = `${DEMO_BASE_URL}live-editor/`

function getPublicUrl(p: string) {
  return `${DEMO_BASE_URL}/${p.replace(/^\//, '')}`
}

const HEADER_MODE_ICON_STYLE: React.CSSProperties = {
  marginRight: '0.5em',
  position: 'relative',
  top: '2px',
}

export default function Header() {
  const { isDarkMode, enable, disable } = useDarkMode()
  const toggleDarkMode = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        enable()
      } else {
        disable()
      }
    },
    [isDarkMode],
  )

  const modeIcon = isDarkMode ? 'eva:moon-fill' : 'eva:sun-fill'

  return (
    <div className="Header flex justify-between px-3 py-3 shadow">
      <div>
        <a href={LIVE_EDITOR_URL} className="Header__brand flex items-center">
          <img src={getPublicUrl('/img/logo.svg')} alt="Logo" className="Header__logo" />
          Pintora Live Editor
        </a>
      </div>
      <div className="flex">
        <iconify-icon icon={modeIcon} width="22" inline={true} style={HEADER_MODE_ICON_STYLE}></iconify-icon>
        <input type="checkbox" className="toggle" checked={isDarkMode} onChange={toggleDarkMode} />
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
