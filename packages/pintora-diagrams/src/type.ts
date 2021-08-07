import { SequenceConf } from './sequence'
import { ErConf } from './er'
import { ComponentConf } from './component'
import { ITheme } from './util/themes/base'

export type DiagramsConf = {
  themeConfig: {
    theme: string
    darkTheme?: string
    themeVariables: ITheme
  }
  component: ComponentConf
  er: ErConf
  sequence: SequenceConf
}
