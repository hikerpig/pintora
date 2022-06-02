import { IDiagram } from './type'
import { logger } from './logger'
import { diagramEventManager } from './diagram-event'

export class DiagramRegistry {
  diagrams: Record<string, IDiagram> = {}

  registerDiagram(name: string, diagram: IDiagram) {
    if (this.diagrams[name]) {
      logger.warn(`[pintora] duplicate diagram: ${name}`)
    } else {
      if (diagram.eventRecognizer) {
        diagramEventManager.addRecognizer(diagram.eventRecognizer)
      }
    }
    this.diagrams[name] = diagram
  }

  detectDiagram(text: string) {
    let diagram = this.diagrams['sequenceDiagram'] // default
    for (const d of Object.values(this.diagrams)) {
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

export const diagramRegistry = new DiagramRegistry()
