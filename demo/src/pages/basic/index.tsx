import React, { useEffect, useRef } from 'react'
import pintora, { setLogLevel } from '@pintora/core'
import { init } from '@pintora/diagrams'
import { render } from "@pintora/renderer"

setLogLevel('debug')
init()

const testSequenceDiagram = `
sequenceDiagram
    User->>+Pintora: render this
    Note right of User: Text in note
    activate Pintora
    Note over User,Pintora: Note on Pintora
    Pintora-->>User: your figure here
    deactivate Pintora
`

export default function Basic() {
  const containerRef = useRef<HTMLDivElement>()

  useEffect(() => {
    if (!containerRef.current) return

    pintora.renderTo(testSequenceDiagram, {
      container: containerRef.current,
      render(ir, opts) {
        render(ir, {
          // renderer: 'canvas',
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
  })

  return (
    <div className="Basic page">
      <div className="figure-container" ref={containerRef as any}></div>
    </div>
  )
}
