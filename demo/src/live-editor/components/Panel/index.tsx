import React, { useCallback, useState } from 'react'
import PanelHeader, { Tabs } from '../PanelHeader'
import './Panel.less'

interface PanelProps {
  title: string
  tabs?: Tabs
  className?: string
  onCurrentTabChange?(v: string): void
}

const Panel: React.FC<PanelProps> = ({ className, title, tabs, children, onCurrentTabChange }) => {
  const [currentTab, setCurrentTab] = useState(tabs?.[0]?.key)
  const setCurrentTabProp = useCallback(
    key => {
      setCurrentTab(key)
      onCurrentTabChange && onCurrentTabChange(key)
    },
    [tabs],
  )

  return (
    <div className={`Panel ${className || ''} border-secondary border-opacity-40 rounded`}>
      <PanelHeader title={title} tabs={tabs} currentTab={currentTab} setCurrentTab={setCurrentTabProp} />
      <div className="Panel__content">{children}</div>
    </div>
  )
}

export default Panel
