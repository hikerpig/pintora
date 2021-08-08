import { IDiagram } from './type'
import { logger } from './logger'

class Registry {
  diagrams: Record<string, IDiagram> = {}

  registerDiagram(name: string, diagram: IDiagram) {
    if (this.diagrams[name]) {
      logger.warn(`[pintora] duplicate diagram: ${name}`)
    }
    this.diagrams[name] = diagram
  }

  detectDiagram(text: string) {
    let diagram = this.diagrams['sequenceDiagram'] // default
    for (const d of Object.values(this.diagrams)) {
      // console.log('test d with text', d)
      if (d.pattern.test(text)) {
        diagram = d
        break
      }
    }
    return diagram
  }

  getDiagram(name: string) {
    return this.diagrams[name]
  }
}

export const registry = new Registry()
