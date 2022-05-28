import { IDiagramEvent, IGraphicEvent, DiagramEventType, PintoraDiagramItemDatas } from './types/event'
import { GraphicsIR } from './types/graphics'

export * from './types/graphics'

export { Maybe, OrNull, DeepPartial } from './types/helper'

export type { DiagramEventType, PintoraDiagramItemDatas }

export interface IDiagram<D = unknown, Config = unknown> {
  /**
   * A pattern used to detect if the input text should be handled by this diagram.
   * @example /^\s*sequenceDiagram/
   */
  pattern: RegExp
  parser: IDiagramParser<D, Config>
  artist: IDiagramArtist<D, Config>
  eventRecognizer?: IDiagramEventRecognizer<D>
  configKey?: string
  clear(): void
}

/**
 * Parse input text to DiagramIR
 */
export interface IDiagramParser<D, Config = unknown> {
  parse(text: string, config?: Config): D
}

export type DiagramArtistOptions = {
  containerSize?: {
    width: number
    height?: number
  }
}

/**
 * Convert DiagramIR to GraphicsIR
 */
export interface IDiagramArtist<D, Config = unknown> {
  draw(diagramIR: D, config?: Config, opts?: DiagramArtistOptions): GraphicsIR
}

export interface IDiagramEventRecognizer<D = unknown> {
  recognize(graphicEvent: IGraphicEvent, diagramIR: D): IDiagramEvent | undefined | void
}

export type GrahpicEventHandler = (event: IGraphicEvent) => void

/**
 * Renders GraphicsIR to outside world - may be svg / canvas or others.
 */
export interface IRenderer {
  render(): void
  setContainer(container: any): void
  getRootElement(): Element
  on(name: string, handler: GrahpicEventHandler): void
}
