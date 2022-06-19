import { IDiagram } from '@pintora/core'
import db, { DotIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { DOTConf } from './config'

export { DOTConf, DotIR }

export const dotDiagram: IDiagram<DotIR, DOTConf> = {
  pattern: /^\s*dotDiagram/,
  parser: {
    parse(text) {
      parse(text)
      return db.getDiagramIR()
    },
  },
  artist,
  configKey: 'dot',
  clear() {
    db.clear()
  },
}

export default dotDiagram
