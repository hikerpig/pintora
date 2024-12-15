import { IDiagram } from '@pintora/core'
import db, { ErDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { configKey, ErConf } from './config'
import { eventRecognizer, ErDiagramItemDatas } from './event-recognizer'
import { ParserWithPreprocessor } from '../util/preproccesor'

export type { ErDiagramIR, ErConf, ErDiagramItemDatas }

export const erDiagram: IDiagram<ErDiagramIR, ErConf> = {
  pattern: /^\s*erDiagram/,
  parser: new ParserWithPreprocessor({
    db,
    parse,
  }),
  artist,
  configKey,
  eventRecognizer,
  clear() {
    db.clear()
  },
}
