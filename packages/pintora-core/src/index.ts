export * from './type'
import { diagramRegistry } from './diagram-registry'
import { diagramEventManager, DiagramEvent, diagramEventMakerFactory } from './diagram-event'
import { DiagramArtistOptions } from './type'
import { IDiagramEvent, IGraphicEvent } from './types/event'
import { logger, setLogLevel } from './logger'
import configApi, { PintoraConfig } from './config'

export * from './util'
import { encodeForUrl, decodeCodeInUrl, makeMark, calculateTextDimensions, parseColor, tinycolor } from './util'
import { symbolRegistry, SymbolDef, SymbolStyleAttrs } from './symbol-registry'
import { ConfigParam, ConfigMeta, interpreteConfigs } from './config-engine'
import { themeRegistry, ITheme } from './themes'
import { DEFAULT_FONT_FAMILY } from './consts'
import * as configEngine from './config-engine'

export {
  logger,
  setLogLevel,
  configApi,
  symbolRegistry,
  interpreteConfigs,
  tinycolor,
  themeRegistry,
  DEFAULT_FONT_FAMILY,
  diagramEventManager,
  DiagramEvent,
  diagramEventMakerFactory,
}

export type {
  SymbolDef,
  SymbolStyleAttrs,
  ConfigParam,
  ConfigMeta,
  PintoraConfig,
  ITheme,
  DiagramArtistOptions,
  IGraphicEvent,
  IDiagramEvent,
}

type DrawOptions = {
  onError?(error: Error): void
  config?: PintoraConfig
} & DiagramArtistOptions

const pintora = {
  configApi,
  diagramRegistry,
  symbolRegistry,
  configEngine,
  themeRegistry,
  diagramEventManager,
  parseAndDraw(text: string, opts: DrawOptions) {
    const { onError, config } = opts
    const diagram = diagramRegistry.detectDiagram(text)
    if (!diagram) {
      const errMessage = `[pintora] no diagram detected with input: ${text.slice(0, 30)}`
      logger.warn(errMessage)
      onError && onError(new Error(errMessage))
      return
    }

    diagram.clear()
    const diagramIR = diagram.parser.parse(text)

    let configForArtist = undefined

    if (config && diagram.configKey && (config as any)[diagram.configKey]) {
      configForArtist = (config as any)[diagram.configKey]
    }
    const graphicIR = diagram.artist.draw(diagramIR, configForArtist, opts)

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
    parseColor,
    tinycolor,
  },
}

export default pintora
