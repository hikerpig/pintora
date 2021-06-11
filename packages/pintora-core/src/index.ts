import { registry } from './registry'
import { IDiagram, GraphicsIR } from './type'

export * from './type'

import { logger, setLogLevel } from './logger'

export * from './util'

export {
  logger,
  setLogLevel
}

type DrawOptions = {
  onError?(error: Error): void
}

const pintora = {
  registerDiagram(name: string, diagram: IDiagram) {
    registry.registerDiagram(name, diagram)
  },
  parseAndDraw(text: string, opts: DrawOptions) {
    const { onError } = opts
    const diagram = registry.detectDiagram(text)
    if (!diagram) {
      const errMessage = `[pintora] no diagram detected with input: ${text.slice(0, 30)}`
      logger.warn(errMessage)
      onError && onError(new Error(errMessage))
      return
    }

    diagram.clear()
    const diagramIR = diagram.parser.parse(text)
    const graphicIR = diagram.artist.draw(diagramIR)

    return {
      diagramIR,
      graphicIR,
    }
  },
}

export default pintora
