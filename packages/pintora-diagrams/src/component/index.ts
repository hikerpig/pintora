import { IDiagram } from '@pintora/core'
import db, { ComponentDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { ComponentConf, conf } from './config'

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
  setConfig(c) {
    Object.assign(conf, c)
  }
}

export default componentDiagram
