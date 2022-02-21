import { GraphicsIR } from './types/graphics'

export * from './types/graphics'

export { Maybe, OrNull, DeepPartial } from './types/helper'

export interface IDiagram<D = unknown, Config = unknown> {
  /**
   * A pattern used to detect if the input text should be handled by this diagram.
   * @example /^\s*sequenceDiagram/
   */
  pattern: RegExp
  parser: IDiagramParser<D, Config>
  artist: IDiagramArtist<D, Config>
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
