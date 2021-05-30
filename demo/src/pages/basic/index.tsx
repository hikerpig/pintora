import React, { useEffect, useRef } from 'react'
import pintora, { setLogLevel } from '@pintora/core'
import { init } from '@pintora/diagrams'
import { render } from "@pintora/renderer"
import './index.css'

setLogLevel('debug')
init()

const testSequenceDiagram = `
sequenceDiagram
    autonumber
    User->>+Pintora: render this
    activate Pintora
    loop Check input
      Pintora-->>Pintora: Has input changed?
    end
    Pintora-->>User: your figure here
    deactivate Pintora
    Note over User,Pintora: Note over
    Note right of User: Note aside actor
`
const lineExample = `
sequenceDiagram
    John-->>Alice: Line example 1
    John--xAlice: Line example 2
    John-xAlice: Line example 3
    John-)Alice: Line example 4
    John--)Alice: Line example 5
    John->Alice: Line example 6
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
