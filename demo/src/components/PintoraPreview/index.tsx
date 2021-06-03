import React, { useEffect, useRef } from 'react'
import { RenderOptions } from '@pintora/renderer'
import pintora from '@pintora/standalone'
import './PintoraPreview.less'

interface Props {
  code: string
  renderer?: RenderOptions['renderer']
}

export default function PintoraPreview(props: Props) {
  const { code, renderer } = props
  const containerRef = useRef<HTMLDivElement>()

  useEffect(() => {
    if (!containerRef.current) return

    pintora.renderTo(code, {
      container: containerRef.current,
      renderer,
      onRender(renderer: any) {
        ;(window as any).pintoraRenderer = renderer
      },
    })

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  }, [code, renderer])

  return (
    <div className="PintoraPreview">
      <div className="PintoraPreview__figure-container" ref={containerRef as any}></div>
    </div>
  )
}
