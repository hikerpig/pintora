import { registry } from "./registry"
import { IDiagram } from "./type"

export * from "./type"

const pintora = {
  registerDiagram(name: string, diagram: IDiagram) {
    registry.registerDiagram(name, diagram)
  },
}

export default pintora
