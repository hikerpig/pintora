import { GraphicsIR } from './types/graphics'

export * from './types/graphics'

export {
  Maybe,
  OrNull,
} from './types/helper'

export interface IDiagram<D = any, Config = any> {
  pattern: RegExp
  parser: IDiagramParser<D, Config>
  artist: IDiagramArtist<D, Config>
  db?: any
  configKey?: string
  clear(): void
  // setConfig,
}

export interface IDiagramParser<D, Config = any> {
  parse(text: string, config?: Config): D
}

export interface IDiagramArtist<D, Config = any> {
  draw(diagramIR: D, config?: Config): GraphicsIR
}
