import React, { useCallback } from 'react'
import './PanelHeader.less'

export type TabItem = {
  key: string
  label: string
}

export type Tabs = TabItem[]

export interface PanelHeaderProps {
  title: string
  tabs: Tabs | undefined
  currentTab: string | undefined
  setCurrentTab(key: string): void
  appendix?: JSX.Element
}

const PanelHeader = ({ title, tabs, currentTab, setCurrentTab, appendix }: PanelHeaderProps) => {
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
                className={`tab tab-bordered ${currentTab === tabItem.key ? 'tab-active' : ''}`}
                key={tabItem.key}
                onClick={() => onClickTab(tabItem.key)}
              >
                {tabItem.label}
              </a>
            )
          })}
      </div>
      {appendix && <div className="PanelHeader__appendix flex items-center">{appendix}</div> }
    </div>
  )
}

export default PanelHeader
