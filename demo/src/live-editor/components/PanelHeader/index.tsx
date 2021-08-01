import React, { useCallback } from 'react'
import './PanelHeader.less'

export type TabItem = {
  key: string
  label: string
}

export type Tabs = TabItem[]

interface PanelHeaderProps {
  title: string
  tabs: Tabs | undefined
  currentTab: string | undefined
  setCurrentTab(key: string): void
}

const PanelHeader = ({ title, tabs, currentTab, setCurrentTab }: PanelHeaderProps) => {
  const onClickTab = useCallback(
    (key: string) => {
      setCurrentTab(key)
    },
    [tabs],
  )
  return (
    <div className="PanelHeader flex bg-yellow-500">
      <div className="PanelHeader__title text-lg text-white">{title}</div>
      <div className="tabs flex-grow px-4">
        {tabs &&
          tabs.map(tabItem => {
            return (
              <a
                className={`tab tab-lifted ${currentTab === tabItem.key ? 'tab-active' : ''}`}
                onClick={() => onClickTab(tabItem.key)}
              >
                {tabItem.label}
              </a>
            )
          })}
      </div>
    </div>
  )
}

export default PanelHeader
