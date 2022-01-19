import { IDiagram } from '@pintora/core'
import db, { MindmapIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { MindmapConf } from './config'

export { MindmapIR, MindmapConf }

export const mindmap: IDiagram<MindmapIR, MindmapConf> = {
  pattern: /^\s*mindmap/,
  parser: {
    parse(text) {
      parse(text)
      return db.getDiagramIR()
    },
  },
  artist,
  configKey: 'mindmap',
  clear() {
    db.clear()
  },
}
