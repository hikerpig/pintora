import { defineDiagram } from '../util/define-diagram'
import db, { MindmapIR } from './db'
import artist from './artist'
import grammar from './parser/mindmap'
import { configKey, MindmapConf } from './config'

export type { MindmapIR, MindmapConf }

export const mindmap = defineDiagram<MindmapIR, MindmapConf>({
  pattern: /^\s*mindmap/,
  grammar,
  db,
  draw: artist,
  configKey,
})
