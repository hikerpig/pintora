import { registry } from './registry'
import { IDiagram, GraphicsIR } from './type'

export * from './type'

type RenderOptions = {
  container: HTMLElement
  render(ir: GraphicsIR, opts: { container: HTMLElement }): void
  onDraw?(): void
  onError?(message: string): void
}

const pintora = {
  registerDiagram(name: string, diagram: IDiagram) {
    registry.registerDiagram(name, diagram)
  },
  renderTo(text: string, opts: RenderOptions) {
    const { container, onDraw, onError } = opts
    const diagram = registry.detectDiagram(text)
    console.log('render to', diagram)
    if (!diagram) {
      const errMessage = '[pintora] new diagram detected'
      console.warn(errMessage)
      onError && onError(errMessage)
      return
    }

    const diagramIR = diagram.parser.parse(text)
    const graphicIR = diagram.artist.draw(diagramIR)

    opts.render(graphicIR, { container })
  },
}

export default pintora
