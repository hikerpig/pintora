import { IDiagram } from '@pintora/core'
import db, { MindmapIR } from './db'
import artist from './artist'
import { parser } from './parser'
import { configKey, MindmapConf } from './config'

export type { MindmapIR, MindmapConf }

export const mindmap: IDiagram<MindmapIR, MindmapConf> = {
  pattern: /^\s*mindmap/,
  parser,
  artist,
  configKey,
  clear() {
    db.clear()
  },
}
