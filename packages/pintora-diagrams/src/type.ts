import { SequenceConf, SequenceDiagramItemDatas } from './sequence'
import { ErConf, ErDiagramItemDatas } from './er'
import { ComponentConf } from './component'
import { ActivityConf } from './activity'
import { MindmapConf } from './mindmap'

// type augmentation
declare module '@pintora/core' {
  interface PintoraConfig {
    component: ComponentConf
    er: ErConf
    sequence: SequenceConf
    activity: ActivityConf
    mindmap: MindmapConf
  }

  interface PintoraDiagramItemDatas {
    er: ErDiagramItemDatas
    sequence: SequenceDiagramItemDatas
  }
}
