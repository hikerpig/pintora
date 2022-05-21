import { PintoraConfig } from '@pintora/core'
import { sequenceDiagram, SequenceDiagramIR } from './sequence'
import { erDiagram, ErDiagramIR } from './er'
import { componentDiagram, ComponentDiagramIR } from './component'
import { activityDiagram, ActivityDiagramIR } from './activity'
import { mindmap, MindmapIR } from './mindmap'
import { gantt, GanttIR } from './gantt'
import { BaseDiagramIR } from './util/ir'
import * as PARSER_SHARED from './util/parser-shared'
import './type' // type augmentation
import './util/symbols'

export { PintoraConfig }

export const DIAGRAMS = {
  erDiagram,
  sequenceDiagram,
  componentDiagram,
  activityDiagram,
  mindmap,
  gantt,
}

export {
  BaseDiagramIR,
  SequenceDiagramIR,
  sequenceDiagram,
  erDiagram,
  ErDiagramIR,
  componentDiagram,
  ComponentDiagramIR,
  ActivityDiagramIR,
  MindmapIR,
  mindmap,
  GanttIR,
  gantt,
  PARSER_SHARED,
}
