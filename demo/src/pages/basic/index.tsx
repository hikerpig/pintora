import React, { useEffect, useRef } from 'react'
import pintora from '@pintora/core'
import '@pintora/diagrams'
import { render } from "@pintora/renderer"

const testSequenceDiagram = `
sequenceDiagram
    User->>+Pintora: render this
    Pintora-->>User: your figure here
`

export default function Basic() {
  const containerRef = useRef<HTMLDivElement>()

  useEffect(() => {
    if (!containerRef.current) return

    pintora.renderTo(testSequenceDiagram, {
      container: containerRef.current,
      render(ir, opts) {
        render(ir, opts)
      }
    })
  })

  return (
    <div className="Basic page">
      <div className="figure-container" ref={containerRef as any}></div>
    </div>
  )
}
