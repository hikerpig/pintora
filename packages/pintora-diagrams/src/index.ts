import pintora, { IDiagram } from "@pintora/core"
import { sequenceDiagram } from './sequence'

export function init() {
  pintora.registerDiagram('sequenceDiagram', sequenceDiagram)
}
