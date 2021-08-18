import { registry } from './registry'
import { IDiagram } from './type'

export * from './type'
import { logger, setLogLevel } from './logger'
import configApi from './config'

export * from './util'
import { encodeForUrl, decodeCodeInUrl, makeMark, calculateTextDimensions } from './util'
import { symbolRegistry, SymbolDef, SymbolStyleAttrs } from './symbol-registry'

export {
  logger,
  setLogLevel,
  configApi,
  symbolRegistry,
  SymbolDef,
  SymbolStyleAttrs,
}

type DrawOptions = {
  onError?(error: Error): void
}

const pintora = {
  configApi,
  registerDiagram(name: string, diagram: IDiagram) {
    registry.registerDiagram(name, diagram)
  },
  getDiagram(name: string) {
    return registry.getDiagram(name)
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
  util: {
    encodeForUrl,
    decodeCodeInUrl,
    makeMark,
    calculateTextDimensions,
  },
  symbolRegistry,
}

export default pintora
