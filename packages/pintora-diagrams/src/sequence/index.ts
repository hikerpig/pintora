import { IDiagram } from '@pintora/core'
import { db, SequenceDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { SequenceConf } from './config'
import { eventRecognizer, SequenceDiagramItemDatas } from './event-recognizer'

export type { SequenceDiagramIR, SequenceConf, SequenceDiagramItemDatas }

export const sequenceDiagram: IDiagram<SequenceDiagramIR, SequenceConf> = {
  pattern: /^\s*sequenceDiagram/,
  parser: {
    parse(text) {
      parse(text)
      return db.getDiagramIR()
    },
  },
  artist,
  configKey: 'sequence',
  eventRecognizer,
  clear() {
    db.clear()
  },
}
