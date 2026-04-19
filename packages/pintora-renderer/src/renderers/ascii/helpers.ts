import { parseAndDraw, diagramRegistry } from '@pintora/core'
import { DIAGRAMS } from '@pintora/diagrams'
import { render } from '../../index'

Object.keys(DIAGRAMS).forEach(name => {
  diagramRegistry.registerDiagram(name, DIAGRAMS[name as keyof typeof DIAGRAMS])
})

export function renderToAscii(code: string) {
  const container = document.createElement('div')
  const drawResult = parseAndDraw(code, { containerSize: { width: 800 } })
  if (!drawResult) throw new Error('Failed to parse and draw diagram')

  let text = ''
  render(drawResult.graphicIR, {
    container,
    renderer: 'ascii' as any,
    onRender(renderer) {
      text = (renderer as any).getTextContent?.() || ''
    },
  })
  return text
}
