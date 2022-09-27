import { PintoraConfig } from '@pintora/core'
import { sequenceDiagram, SequenceDiagramIR } from './sequence'
import { erDiagram, ErDiagramIR } from './er'
import { componentDiagram, ComponentDiagramIR } from './component'
import { activityDiagram, ActivityDiagramIR } from './activity'
import { dotDiagram, DotIR } from './dot'
import { mindmap, MindmapIR } from './mindmap'
import { gantt, GanttIR } from './gantt'
import { BaseDiagramIR } from './util/ir'
import * as PARSER_SHARED from './util/parser-shared'
import './type' // type augmentation
import './util/symbols'

export type { PintoraConfig }

export const DIAGRAMS = {
  erDiagram,
  sequenceDiagram,
  componentDiagram,
  activityDiagram,
  mindmap,
  gantt,
  dotDiagram,
}

export type {
  BaseDiagramIR,
  SequenceDiagramIR,
  ErDiagramIR,
  ComponentDiagramIR,
  ActivityDiagramIR,
  DotIR,
  MindmapIR,
  GanttIR,
}
export { sequenceDiagram, erDiagram, componentDiagram, dotDiagram, mindmap, gantt, PARSER_SHARED }
