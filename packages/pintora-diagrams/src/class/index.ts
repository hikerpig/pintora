import { IDiagram } from '@pintora/core'
import db, { ClassIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { ClassConf } from './config'
import { ParserWithPreprocessor } from '../util/preproccesor'

export type { ClassConf, ClassIR }

export const classDiagram: IDiagram<ClassIR, ClassConf> = {
  pattern: /^\s*classDiagram/,
  parser: new ParserWithPreprocessor({
    db,
    parse,
  }),
  artist,
  configKey: 'class',
  clear() {
    db.clear()
  },
}

export default classDiagram
