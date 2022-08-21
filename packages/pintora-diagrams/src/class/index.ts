import { IDiagram } from '@pintora/core'
import db, { ClassIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { ClassConf } from './config'

export type { ClassConf, ClassIR }

export const classDiagram: IDiagram<ClassIR, ClassConf> = {
  pattern: /^\s*classDiagram/,
  parser: {
    parse(text) {
      parse(text)
      return db.getDiagramIR()
    },
  },
  artist,
  configKey: 'class',
  clear() {
    db.clear()
  },
}

export default classDiagram
