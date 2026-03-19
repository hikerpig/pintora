import { defineDiagram } from '../util/define-diagram'
import db, { ErDiagramIR } from './db'
import artist from './artist'
import grammar from './parser/erDiagram'
import { configKey, ErConf } from './config'
import { eventRecognizer, ErDiagramItemDatas } from './event-recognizer'

export type { ErDiagramIR, ErConf, ErDiagramItemDatas }

export const erDiagram = defineDiagram<ErDiagramIR, ErConf>({
  pattern: /^\s*erDiagram/,
  grammar,
  db,
  draw: artist,
  configKey,
  eventRecognizer,
})
