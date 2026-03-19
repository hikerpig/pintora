import { defineDiagram } from '../util/define-diagram'
import db, { DotIR } from './db'
import artist from './artist'
import grammar from './parser/dotDiagram'
import { DOTConf } from './config'

export type { DOTConf, DotIR }

export const dotDiagram = defineDiagram<DotIR, DOTConf>({
  pattern: /^\s*dotDiagram/,
  grammar,
  db,
  draw: artist,
  configKey: 'dot',
})

export default dotDiagram
