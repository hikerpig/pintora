import pintora from "@pintora/core"
import { sequenceDiagram, SequenceDiagramIR } from './sequence'

export {
  SequenceDiagramIR,
}

export function init() {
  pintora.registerDiagram('sequenceDiagram', sequenceDiagram)
}
