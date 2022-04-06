import { IDiagramArtist } from '../type'
import { GraphicsIR } from '../types/graphics'

export function makeArtist<IR, Conf, A extends IDiagramArtist<IR, Conf> = IDiagramArtist<IR, Conf>>(opts: {
  draw: (this: A, ...args: Parameters<A['draw']>) => GraphicsIR
}) {
  const artist = opts
  return artist as IDiagramArtist<IR, Conf>
}
