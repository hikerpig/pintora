import { defineDiagram } from '../util/define-diagram'
import db, { GanttIR } from './db'
import artist from './artist'
import grammar from './parser/gantt'
import { configKey, GanttConf } from './config'

export type { GanttIR, GanttConf }

export const gantt = defineDiagram<GanttIR, GanttConf>({
  pattern: /^\s*gantt/,
  grammar,
  db,
  draw: artist,
  configKey,
})
