import { IDiagram } from '@pintora/core'
import { db, ActivityDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { ActivityConf } from './config'
import { ParserWithPreprocessor } from '../util/preproccesor'

export type { ActivityConf, ActivityDiagramIR }

export const activityDiagram: IDiagram<ActivityDiagramIR, ActivityConf> = {
  pattern: /^\s*activityDiagram/,
  parser: new ParserWithPreprocessor<ActivityDiagramIR>({
    db,
    parse,
  }),
  artist,
  configKey: 'activity',
  clear() {
    db.clear()
  },
}

export default activityDiagram
