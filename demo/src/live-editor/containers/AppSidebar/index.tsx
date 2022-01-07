import React, { useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import classnames from 'classnames'
import './AppSidebar.less'

type Props = {
}

const SIDEBAR_ICONS = [
  {
    name: 'editor' as const,
    label: 'Editor',
    icon: 'eva:file-text-outline',
  },
  {
    name: 'theme-preview' as const,
    label: 'Theme Preview',
    icon: 'eva:color-palette-outline',
  },
]

type ArrayElement<T> = T extends Array<infer I> ? I: any;

type SidebarItem = ArrayElement<typeof SIDEBAR_ICONS>

const AppSidebar = ({}: Props) => {
  const navigate = useNavigate()
  const currentLocation = useLocation()
  const cls = classnames('AppSidebar bg-warmGray-100 flex flex-col items-center')

  const handleClick = useCallback((item: SidebarItem) => {
    navigate(item.name)
  }, [])

  return (
    <div className={cls}>
      {SIDEBAR_ICONS.map(item => {
        const itemCls = classnames('AppSidebar__item btn btn-ghost btn-square mb-2', {
          'btn-active': `/${item.name}` === currentLocation.pathname,
        })
        return (
          <div key={item.name} title={item.label} className={itemCls} onClick={() => handleClick(item)}>
            <i className="iconify-inline" data-icon={item.icon} data-width="26"></i><br />
          </div>
        )
      })}
    </div>
  )
}

export default AppSidebar
