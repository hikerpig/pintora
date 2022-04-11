import React, { PropsWithChildren, useCallback, useState } from 'react'
import PanelHeader, { Tabs, PanelHeaderProps } from '../PanelHeader'
import './Panel.less'

interface PanelProps {
  title: string
  tabs?: Tabs
  className?: string
  initialTab?: string
  onCurrentTabChange?(v: string): void
  headerAppendix?: PanelHeaderProps['appendix']
}

const Panel: React.FC<PropsWithChildren<PanelProps>> = ({
  className,
  title,
  tabs,
  initialTab,
  children,
  onCurrentTabChange,
  headerAppendix,
}) => {
  const [currentTab, setCurrentTab] = useState(initialTab || tabs?.[0]?.key)
  const setCurrentTabProp = useCallback(
    (key: string) => {
      setCurrentTab(key)
      onCurrentTabChange && onCurrentTabChange(key)
    },
    [tabs],
  )

  return (
    <div className={`Panel ${className || ''} border-secondary border-opacity-40 rounded`}>
      <PanelHeader
        title={title}
        tabs={tabs}
        currentTab={currentTab}
        setCurrentTab={setCurrentTabProp}
        appendix={headerAppendix}
      />
      <div className="Panel__content">{children}</div>
    </div>
  )
}

export default Panel
