import type { DiagramArtistOptions, GraphicsIR, IDiagramArtist } from '@pintora/core'
import { styleEngine } from './style-engine'

export abstract class BaseArtist<DiagramIR, Conf> implements IDiagramArtist<DiagramIR, Conf> {
  draw(ir: DiagramIR, config?: Conf, opts?: DiagramArtistOptions): GraphicsIR {
    const gir = this.customDraw(ir, config, opts)
    styleEngine.apply(gir.mark, ir)
    return gir
  }

  abstract customDraw(diagramIR: DiagramIR, config?: Conf, opts?: DiagramArtistOptions): GraphicsIR
}
