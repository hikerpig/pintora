export * from './type'
import configApi, { PintoraConfig } from './config'
import * as configEngine from './config-engine'
import { ConfigMeta, ConfigParam, interpreteConfigs } from './config-engine'
import { DEFAULT_FONT_FAMILY } from './consts'
import { DiagramEvent, diagramEventMakerFactory, diagramEventManager } from './diagram-event'
import { diagramRegistry } from './diagram-registry'
import { logger, setLogLevel } from './logger'
import { preprocessExtractor } from './pre'
import { SymbolDef, symbolRegistry, SymbolStyleAttrs } from './symbol-registry'
import { ITheme, themeRegistry } from './themes'
import { DiagramArtistOptions } from './type'
import { IDiagramEvent, IGraphicEvent } from './types/event'
import { calculateTextDimensions, decodeCodeInUrl, encodeForUrl, makeMark, parseColor, tinycolor } from './util'

export * from './util'

export type DrawOptions = {
  onError?(error: Error): void
  config?: PintoraConfig
} & DiagramArtistOptions

/**
 * Given input text, find diagram implementations in diagramRegistry,
 * parse to diagramIR, and call artist to generate graphicIR
 */
export function parseAndDraw(text: string, opts: DrawOptions) {
  const { onError, config } = opts

  const preResult = preprocessExtractor.parse(text)
  const textToParse = preResult.content

  const diagram = diagramRegistry.detectDiagram(textToParse)
  if (!diagram) {
    const errMessage = `[pintora] no diagram detected with input: ${textToParse.slice(0, 30)}`
    logger.warn(errMessage)
    if (onError) {
      onError(new Error(errMessage))
    }
    return
  }

  diagram.clear()
  const diagramIR = diagram.parser.parse(textToParse, {
    preContent: preResult.hasPreBlock && preResult.preContent ? preResult.preContent : undefined,
  })

  let configForArtist = undefined

  if (config && diagram.configKey && (config as any)[diagram.configKey]) {
    configForArtist = (config as any)[diagram.configKey]
  }
  const graphicIR = diagram.artist.draw(diagramIR, configForArtist, opts)

  return {
    diagramIR,
    graphicIR,
  }
}

export const util = {
  encodeForUrl,
  decodeCodeInUrl,
  makeMark,
  calculateTextDimensions,
  parseColor,
  tinycolor,
}

export {
  configApi,
  configEngine,
  DEFAULT_FONT_FAMILY,
  DiagramEvent,
  diagramEventMakerFactory,
  diagramEventManager,
  diagramRegistry,
  interpreteConfigs,
  logger,
  setLogLevel,
  symbolRegistry,
  themeRegistry,
  tinycolor,
}

export type {
  ConfigMeta,
  ConfigParam,
  DiagramArtistOptions,
  IDiagramEvent,
  IGraphicEvent,
  ITheme,
  PintoraConfig,
  SymbolDef,
  SymbolStyleAttrs,
}
