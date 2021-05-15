export interface IDiagram<D = any, Config = any> {
  pattern: RegExp
  parser: IDiagramParser<D, Config>
  artist: IDiagramArtist<D, Config>
  db?: any
  configKey?: string
  // setConfig,
}

export interface IDiagramParser<D, Config = any> {
  parse(text: string, config?: Config): D
}

export interface IDiagramArtist<D, Config = any> {
  draw(diagramIR: D, config?: Config): GraphicsIR
}

// Graphics
// export interface Mark<A = any> {
//   type: "rect" | "circle" | "group"
//   attr: A
//   style?: any
// }
export type Mark = Rect | Group

export interface IMark {}

export interface Rect extends IMark {
  type: 'rect'
  attr: {}
}

export interface Group extends IMark {
  type: 'group'
  attr: {}
  children: Mark[]
}

export interface Figure {
  mark: Mark
}

export interface GraphicsIR extends Figure {}
