import { sequenceDiagram, SequenceDiagramIR } from './sequence'
import { erDiagram, ErDiagramIR } from './er'
import { componentDiagram, ComponentDiagramIR } from './component'

export const DIAGRAMS = {
  erDiagram,
  sequenceDiagram,
  componentDiagram,
}

export { SequenceDiagramIR, sequenceDiagram, erDiagram, ErDiagramIR, componentDiagram, ComponentDiagramIR }
