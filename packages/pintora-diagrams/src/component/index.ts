import { IDiagram } from '@pintora/core'
import db, { ComponentDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { ComponentConf } from './config'

export { ComponentConf, ComponentDiagramIR }

export const componentDiagram: IDiagram<ComponentDiagramIR, ComponentConf> = {
  pattern: /^\s*componentDiagram/,
  parser: {
    parse(text, config) {
      parse(text)
      db.fillMissingElements()
      return db.getDiagramIR()
    },
  },
  artist,
  db,
  clear() {
    db.clear()
  },
}

export default componentDiagram
