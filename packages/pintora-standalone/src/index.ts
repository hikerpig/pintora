import pintora from '@pintora/core'
import { sequenceDiagram } from '@pintora/diagrams'
import { render, RenderOptions } from '@pintora/renderer'

function initDiagrams() {
  pintora.registerDiagram('sequenceDiagram', sequenceDiagram)
}

initDiagrams()

interface RenderToOptions extends RenderOptions {
  onError?(message: string): void
}

const pintoraStandalone = {
  ...pintora,
  renderTo(code: string, options: RenderToOptions) {
    const { container } = options
    let ctn: HTMLDivElement
    if (typeof container === 'string') {
      ctn = document.querySelector(container) as any
    } else {
      ctn = container
    }

    const drawResult = pintoraStandalone.parseAndDraw(code, options)

    render(drawResult.graphicIR, options)
  },
}

export default pintoraStandalone
