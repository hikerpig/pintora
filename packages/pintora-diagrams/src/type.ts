import { SequenceDiagramIR } from './sequence'
import { ErDiagramIR } from './er'
import { ComponentDiagramIR } from './component'
import { ITheme } from './util/themes/base'

export type DiagramsConf = {
  core: {
    theme: string
    darkTheme?: string
    themeVariables: ITheme
  }
  component: ComponentDiagramIR
  er: ErDiagramIR
  sequence: SequenceDiagramIR
}
