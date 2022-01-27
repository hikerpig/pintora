import { SequenceConf } from './sequence'
import { ErConf } from './er'
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
}
