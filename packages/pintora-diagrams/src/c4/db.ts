import { BaseDb } from '../util/base-db'
import {
  isBoundaryMacro,
  isElementMacro,
  isRelationshipMacro,
  normalizeBoundaryMacro,
  normalizeElementMacro,
  normalizeRelationshipMacro,
} from './macro'
import {
  C4Action,
  C4Boundary,
  C4BoundaryMacroCall,
  C4DiagramIR,
  C4DiagramKind,
  C4Element,
  C4MacroCall,
  C4Relationship,
} from './type'

type C4Node = C4Element | C4Boundary

function cloneNodeForCompare<T extends C4Node>(node: T): Omit<T, 'itemId'> {
  const { itemId, ...copy } = node
  return copy
}

function sameNode(a: C4Node, b: C4Node) {
  return JSON.stringify(cloneNodeForCompare(a)) === JSON.stringify(cloneNodeForCompare(b))
}

export class C4Db extends BaseDb {
  protected diagramKind: C4DiagramKind = 'context'
  protected elements: Record<string, C4Element> = {}
  protected boundaries: Record<string, C4Boundary> = {}
  protected relationships: C4Relationship[] = []

  setDiagramEntry(entry: string) {
    switch (entry) {
      case 'C4Container':
        this.diagramKind = 'container'
        break
      case 'C4Component':
        this.diagramKind = 'component'
        break
      case 'C4Context':
      case 'c4Diagram':
        this.diagramKind = 'context'
        break
      case 'C4Dynamic':
      case 'C4Deployment':
        throw new Error(`[c4] ${entry} is recognized but not supported by the first C4 implementation`)
      default:
        throw new Error(`[c4] unsupported diagram entry: ${entry}`)
    }
  }

  apply(action: C4Action | C4Action[]) {
    if (Array.isArray(action)) {
      action.forEach(item => this.apply(item))
      return
    }
    if (!action) return

    switch (action.type) {
      case 'setTitle':
        this.title = action.text
        return
      case 'addParam':
        this.configParams.push(action)
        return
      case 'overrideConfig':
        this.addOverrideConfig(action)
        return
      case 'boundaryMacro':
        this.addBoundaryAction(action)
        return
      case 'macro':
        this.addMacroAction(action)
        return
    }
  }

  protected addBoundaryAction(action: C4BoundaryMacroCall, parent?: string) {
    const boundary = normalizeBoundaryMacro(action.name, action.args, parent)
    this.addBoundary(boundary)

    action.children.forEach(child => {
      if (child.type === 'boundaryMacro') {
        this.addBoundaryAction(child, boundary.id)
        boundary.children.push(normalizeBoundaryMacro(child.name, child.args, boundary.id).id)
      } else if (child.type === 'macro') {
        const childId = this.addMacroAction(child, boundary.id)
        if (childId) boundary.children.push(childId)
      } else {
        this.apply(child)
      }
    })
  }

  protected addMacroAction(action: C4MacroCall, parent?: string) {
    if (isElementMacro(action.name)) {
      const element = normalizeElementMacro(action.name, action.args, parent)
      this.addElement(element)
      return element.id
    }

    if (isRelationshipMacro(action.name)) {
      const relationship = normalizeRelationshipMacro(action.name, action.args, this.relationships.length)
      this.relationships.push(relationship)
      return ''
    }

    if (isBoundaryMacro(action.name)) {
      const boundary = normalizeBoundaryMacro(action.name, action.args, parent)
      this.addBoundary(boundary)
      return boundary.id
    }

    throw new Error(`[c4] unsupported macro: ${action.name}`)
  }

  protected addElement(element: C4Element) {
    const existing = this.elements[element.id]
    if (existing) {
      if (!sameNode(existing, element)) {
        throw new Error(`[c4] duplicate element alias with different data: ${element.id}`)
      }
      return
    }
    this.elements[element.id] = element
  }

  protected addBoundary(boundary: C4Boundary) {
    const existing = this.boundaries[boundary.id]
    if (existing) {
      if (!sameNode({ ...existing, children: [] }, { ...boundary, children: [] })) {
        throw new Error(`[c4] duplicate boundary alias with different data: ${boundary.id}`)
      }
      return
    }
    this.boundaries[boundary.id] = boundary
  }

  finalize() {
    this.relationships.forEach(rel => {
      if (!this.elements[rel.source] && !this.boundaries[rel.source]) {
        throw new Error(`[c4] relationship source is not declared: ${rel.source}`)
      }
      if (!this.elements[rel.target] && !this.boundaries[rel.target]) {
        throw new Error(`[c4] relationship target is not declared: ${rel.target}`)
      }
    })
  }

  getDiagramIR(): C4DiagramIR {
    return {
      diagramKind: this.diagramKind,
      elements: this.elements,
      boundaries: this.boundaries,
      relationships: this.relationships,
      ...this.getBaseDiagramIR(),
    }
  }

  override clear() {
    super.clear()
    this.diagramKind = 'context'
    this.elements = {}
    this.boundaries = {}
    this.relationships = []
  }
}

const db = new C4Db()

export default db
