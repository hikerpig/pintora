import { IDiagram } from '@pintora/core'
import { db, ActivityDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { ActivityConf } from './config'

export type { ActivityConf, ActivityDiagramIR }

export const activityDiagram: IDiagram<ActivityDiagramIR, ActivityConf> = {
  pattern: /^\s*activityDiagram/,
  parser: {
    parse(text) {
      parse(text)
      return db.getDiagramIR()
    },
  },
  artist,
  configKey: 'activity',
  clear() {
    db.clear()
  },
}

export default activityDiagram
