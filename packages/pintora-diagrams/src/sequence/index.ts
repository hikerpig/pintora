import { defineDiagram } from '../util/define-diagram'
import { db, SequenceDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { SequenceConf } from './config'
import { eventRecognizer, SequenceDiagramItemDatas } from './event-recognizer'
import { ParserWithPreprocessor } from '../util/preproccesor'

export type { SequenceDiagramIR, SequenceConf, SequenceDiagramItemDatas }

export const sequenceDiagram = defineDiagram<SequenceDiagramIR, SequenceConf>({
  pattern: /^\s*sequenceDiagram/,
  db,
  draw: artist,
  configKey: 'sequence',
  eventRecognizer,
  parser: new ParserWithPreprocessor({
    db,
    parse,
  }),
})
