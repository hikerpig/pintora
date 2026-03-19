import { IDiagramEvent, IGraphicEvent, DiagramEventType, PintoraDiagramItemDatas } from './types/event'
import { GraphicsIR } from './types/graphics'
import { TLayoutDirection } from './config-engine'

export * from './types/graphics'

export type { Maybe, OrNull, DeepPartial } from './types/helper'

export type { DiagramEventType, PintoraDiagramItemDatas }

export type { TLayoutDirection }

export interface IDiagram<D = unknown, Config = unknown> {
  /**
   * A pattern used to detect if the input text should be handled by this diagram.
   * @example /^\s*sequenceDiagram/
   */
  pattern: RegExp
  parser: IDiagramParser<D>
  artist: IDiagramArtist<D, Config>
  eventRecognizer?: IDiagramEventRecognizer<D>
  configKey?: string
  clear(): void
}

/**
 * Parse input text to DiagramIR
 */
export interface IDiagramParser<D> {
  parse(text: string, context?: ParseContext): D
}

export type ParseContext = {
  preContent?: string
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
  on(name: string, handler: GrahpicEventHandler): () => void
}

/**
 * Configuration for defineDiagram factory function
 */
export type DefineDiagramConfig<D = unknown, Config = unknown, DB = any> = {
  /** Pattern to detect if input text should be handled by this diagram */
  pattern: RegExp
  /** Grammar for parsing the diagram text */
  grammar?: any
  /** Database instance for the diagram */
  db?: DB
  /** Either a draw function that converts IR to GraphicsIR, or an existing artist instance */
  draw: ((diagramIR: D, config?: Config, opts?: DiagramArtistOptions) => GraphicsIR) | IDiagramArtist<D, Config>
  /** Config key for this diagram type */
  configKey?: string
  /** Optional event recognizer for interactive diagrams */
  eventRecognizer?: IDiagramEventRecognizer<D>
  /** Optional custom parser implementation (overrides default grammar-based parser) */
  parser?: IDiagramParser<D>
  /** Optional custom clear function for state cleanup */
  clear?: () => void
}

/**
 * Factory function to define a new diagram with minimal boilerplate
 */
export type DefineDiagramFn = <D = unknown, Config = unknown>(
  config: DefineDiagramConfig<D, Config>,
) => IDiagram<D, Config>
