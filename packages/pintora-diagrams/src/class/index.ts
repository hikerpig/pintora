import { defineDiagram } from '../util/define-diagram'
import db, { ClassIR } from './db'
import artist from './artist'
import grammar from './parser/classDiagram'
import { ClassConf } from './config'

export type { ClassConf, ClassIR }

export const classDiagram = defineDiagram<ClassIR, ClassConf>({
  pattern: /^\s*classDiagram/,
  grammar,
  db,
  draw: artist,
  configKey: 'class',
})

export default classDiagram
