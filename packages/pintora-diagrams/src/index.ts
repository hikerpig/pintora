import { configApi, PintoraConfig } from '@pintora/core'
import { sequenceDiagram, SequenceDiagramIR } from './sequence'
import { erDiagram, ErDiagramIR } from './er'
import { componentDiagram, ComponentDiagramIR } from './component'
import { activityDiagram, ActivityDiagramIR } from './activity'
import THEMES, { ITheme } from './util/themes/index'
import './type' // type augmentation
import './util/symbols'

export { PintoraConfig, THEMES, ITheme }

configApi.setConfig<PintoraConfig>({
  themeConfig: {
    theme: 'default',
    darkTheme: 'dark',
    themeVariables: THEMES.default,
    // themeVariables: THEMES.dark,
  },
})

export const DIAGRAMS = {
  erDiagram,
  sequenceDiagram,
  componentDiagram,
  activityDiagram,
}

export {
  SequenceDiagramIR,
  sequenceDiagram,
  erDiagram,
  ErDiagramIR,
  componentDiagram,
  ComponentDiagramIR,
  ActivityDiagramIR,
}
