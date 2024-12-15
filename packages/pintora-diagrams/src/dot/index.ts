import { IDiagram } from '@pintora/core'
import db, { DotIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { DOTConf } from './config'
import { ParserWithPreprocessor } from '../util/preproccesor'

export type { DOTConf, DotIR }

export const dotDiagram: IDiagram<DotIR, DOTConf> = {
  pattern: /^\s*dotDiagram/,
  parser: new ParserWithPreprocessor({
    db,
    parse,
  }),
  artist,
  configKey: 'dot',
  clear() {
    db.clear()
  },
}

export default dotDiagram
