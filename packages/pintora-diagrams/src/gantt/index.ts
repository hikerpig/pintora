import { IDiagram } from '@pintora/core'
import db, { GanttIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { configKey, GanttConf } from './config'

export type { GanttIR, GanttConf }

export const gantt: IDiagram<GanttIR, GanttConf> = {
  pattern: /^\s*gantt/,
  parser: {
    parse(text) {
      parse(text)
      return db.getDiagramIR()
    },
  },
  artist,
  configKey,
  clear() {
    db.clear()
  },
}
