import { SequenceConf } from './sequence'
import { ErConf } from './er'
import { ComponentConf } from './component'
import { ActivityConf } from './activity'
import { MindmapConf } from './mindmap'
import { ITheme } from './util/themes/base'

// type augmentation
declare module '@pintora/core' {
  interface PintoraConfig {
    themeConfig: {
      theme: string
      darkTheme?: string
      themeVariables: ITheme
    }
    component: ComponentConf
    er: ErConf
    sequence: SequenceConf
    activity: ActivityConf
    mindmap: MindmapConf
  }
}
