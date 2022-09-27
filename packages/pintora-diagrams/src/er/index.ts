import { IDiagram } from '@pintora/core'
import db, { ErDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { configKey, ErConf } from './config'
import { eventRecognizer, ErDiagramItemDatas } from './event-recognizer'

export type { ErDiagramIR, ErConf, ErDiagramItemDatas }

export const erDiagram: IDiagram<ErDiagramIR, ErConf> = {
  pattern: /^\s*erDiagram/,
  parser: {
    parse(text) {
      parse(text)
      return db.getDiagramIR()
    },
  },
  artist,
  configKey,
  eventRecognizer,
  clear() {
    db.clear()
  },
}
