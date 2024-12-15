import { IDiagram } from '@pintora/core'
import db, { GanttIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { configKey, GanttConf } from './config'
import { ParserWithPreprocessor } from '../util/preproccesor'

export type { GanttIR, GanttConf }

export const gantt: IDiagram<GanttIR, GanttConf> = {
  pattern: /^\s*gantt/,
  parser: new ParserWithPreprocessor({
    db,
    parse,
  }),
  artist,
  configKey,
  clear() {
    db.clear()
  },
}
