import { configApi } from '@pintora/core'
import { sequenceDiagram, SequenceDiagramIR } from './sequence'
import { erDiagram, ErDiagramIR } from './er'
import { componentDiagram, ComponentDiagramIR } from './component'
import { DiagramsConf } from './type'
import THEMES from './util/themes/index'
import './util/symbols'

export { DiagramsConf, THEMES }

configApi.setConfig<DiagramsConf>({
  themeConfig: {
    theme: 'default',
    darkTheme: 'dark',
    themeVariables: THEMES.default,
    // themeVariables: THEMES.dark,
  }
})

export const DIAGRAMS = {
  erDiagram,
  sequenceDiagram,
  componentDiagram,
}

export { SequenceDiagramIR, sequenceDiagram, erDiagram, ErDiagramIR, componentDiagram, ComponentDiagramIR }
