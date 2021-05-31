import React, { useEffect, useRef } from 'react'
import pintora, { setLogLevel } from '@pintora/core'
import { render, RenderOptions } from "@pintora/renderer"
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
      render(ir, opts) {
        render(ir, {
          renderer,
          onRender(renderer: any) {
            ;(window as any).pintoraRenderer = renderer
          },
          ...opts,
        })
      }
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
