import React, { PropsWithChildren } from 'react'
import './Buttons.less'

interface ButtonsProps {}

const Buttons: React.FC<PropsWithChildren<ButtonsProps>> = ({ children }) => {
  return <div className="Buttons flex flex-wrap p-3">{children}</div>
}

export default Buttons
