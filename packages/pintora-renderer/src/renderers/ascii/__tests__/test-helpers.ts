import { parseAndDraw, diagramRegistry, GraphicsIR } from '@pintora/core'
import { DIAGRAMS } from '@pintora/diagrams'
import { render } from '../../../index'

// Register all diagrams
Object.keys(DIAGRAMS).forEach((name) => {
  diagramRegistry.registerDiagram(name, DIAGRAMS[name as keyof typeof DIAGRAMS])
})

export type RenderToAsciiOptions = {
  container?: HTMLElement
}

function shouldLogAsciiText() {
  return process.env.PINTORA_ASCII_TEST_DEBUG === '1'
}

/**
 * Helper to render DSL code to ASCII text output.
 * This is useful for testing ASCII renderer behavior without going through the full standalone layer.
 */
export function renderToAscii(code: string, options: RenderToAsciiOptions = {}): string {
  const container = options.container || document.createElement('div')

  const drawResult = parseAndDraw(code, {
    containerSize: { width: container.clientWidth || 800 },
  })

  if (!drawResult) {
    throw new Error('Failed to parse and draw diagram')
  }

  let text = ''
  render(drawResult.graphicIR, {
    container,
    renderer: 'ascii',
    onRender(renderer) {
      text = renderer.getTextContent?.() || ''
    },
  })

  if (shouldLogAsciiText()) {
    // Helpful for debugging renderer regressions without editing test bodies.
    console.log(`\n${text}\n`)
  }

  return text
}

/**
 * Helper to get GraphicsIR from DSL code for direct renderer testing.
 */
export function getGraphicsIR(code: string): GraphicsIR {
  const drawResult = parseAndDraw(code, {
    containerSize: { width: 800 },
  })

  if (!drawResult) {
    throw new Error('Failed to parse and draw diagram')
  }

  return drawResult.graphicIR
}
