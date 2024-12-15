import { IDiagram } from '@pintora/core'
import { ParserWithPreprocessor } from '../util/preproccesor'
import artist from './artist'
import { ComponentConf, configKey } from './config'
import db, { ComponentDiagramIR } from './db'
import { parse } from './parser'

export type { ComponentConf, ComponentDiagramIR }

export const componentDiagram: IDiagram<ComponentDiagramIR, ComponentConf> = {
  pattern: /^\s*componentDiagram/,
  parser: new ParserWithPreprocessor({
    db,
    parse(text) {
      parse(text)
      db.fillMissingElements()
    },
  }),
  artist,
  configKey,
  clear() {
    db.clear()
  },
}

export default componentDiagram
