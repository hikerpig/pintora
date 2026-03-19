import { defineDiagram } from '../util/define-diagram'
import { db, ActivityDiagramIR } from './db'
import artist from './artist'
import grammar from './parser/activityDiagram'
import { ActivityConf } from './config'

export type { ActivityConf, ActivityDiagramIR }

export const activityDiagram = defineDiagram<ActivityDiagramIR, ActivityConf>({
  pattern: /^\s*activityDiagram/,
  grammar,
  db,
  draw: artist,
  configKey: 'activity',
})

export default activityDiagram
