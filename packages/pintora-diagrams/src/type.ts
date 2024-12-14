import { SequenceConf, SequenceDiagramItemDatas } from './sequence'
import { ErConf, ErDiagramItemDatas } from './er'
import { ComponentConf } from './component'
import { ActivityConf } from './activity'
import { MindmapConf } from './mindmap'
import { GanttConf } from './gantt'
import { DOTConf } from './dot'
import { ClassConf } from './class'

// type augmentation
declare module '@pintora/core' {
  interface PintoraConfig {
    component: ComponentConf
    er: ErConf
    sequence: SequenceConf
    activity: ActivityConf
    mindmap: MindmapConf
    gantt: GanttConf
    dot: DOTConf
    class: ClassConf
  }

  interface PintoraDiagramItemDatas {
    er: ErDiagramItemDatas
    sequence: SequenceDiagramItemDatas
  }
}
