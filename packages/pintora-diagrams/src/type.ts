export interface IDiagram<D = any, G = any, Config = any> {
  pattern: RegExp
  parser: IDiagramParser<D, Config>
  artist: IDiagramArtist<D, G, Config>
  configKey?: string
  // setConfig,
}

export interface IDiagramParser<D, Config = any> {
  parse(text: string, config: Config): D
}

export interface IDiagramArtist<D, G, Config = any> {
  draw(diagramIR: D, config: Config): G
}
