import { IDiagram } from "./type"

class Registry {
  diagrams: Record<string, IDiagram> = {}

  registerDiagram(name: string, diagram: IDiagram) {
    if (this.diagrams[name]) {
      console.warn(`[pintora] duplicate diagram: ${name}`)
    }
    this.diagrams[name] = diagram
  }

  detectDiagram(text: string) {
    let diagram = this.diagrams["sequenceDiagram"] // default
    for (const d of Object.values(this.diagrams)) {
      if (d.pattern.test(text)) {
        diagram = d
        break
      }
    }
    return diagram
  }
}

export const registry = new Registry()
