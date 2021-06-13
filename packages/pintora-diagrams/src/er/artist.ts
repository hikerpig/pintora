import {
  GraphicsIR,
  IDiagramArtist,
} from '@pintora/core'
import { ErDiagramIR } from './db'

const erArtist: IDiagramArtist<ErDiagramIR> = {
  draw(ir, config) {
    return null
  }
}

export default erArtist
