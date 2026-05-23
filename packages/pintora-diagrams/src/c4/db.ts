import { BaseDb } from '../util/base-db'
import {
  isBoundaryMacro,
  isElementMacro,
  isElementStyleUpdateMacro,
  isElementTagMacro,
  isLegendMacro,
  isLayoutConfigMacro,
  isRelationshipMacro,
  isRelationshipStyleUpdateMacro,
  isRelationshipTagMacro,
  normalizeBoundaryMacro,
  normalizeElementMacro,
  normalizeElementStyleUpdateMacro,
  normalizeElementTagMacro,
  normalizeLayoutConfigMacro,
  normalizeRelationshipMacro,
  normalizeRelationshipStyleUpdateMacro,
  normalizeRelationshipTagMacro,
} from './macro'
import {
  C4Action,
  C4Boundary,
  C4BoundaryMacroCall,
  C4DiagramIR,
  C4DiagramKind,
  C4Element,
  C4ElementStyleOverride,
  C4ElementTagStyle,
  C4LayoutConfig,
  C4MacroCall,
  C4Relationship,
  C4RelationshipStyleOverride,
  C4RelationshipTagStyle,
} from './type'

type C4Node = C4Element | C4Boundary

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a)
  if (keysA.length !== Object.keys(b).length) return false
  for (const key of keysA) {
    const va = a[key]
    const vb = b[key]
    if (Array.isArray(va) && Array.isArray(vb)) {
      if (va.length !== vb.length) return false
      for (let i = 0; i < va.length; i++) {
        if (va[i] !== vb[i]) return false
      }
    } else if (va !== vb) {
      return false
    }
  }
  return true
}

function sameNode(a: C4Node, b: C4Node) {
  const { itemId: _a, ...copyA } = a
  const { itemId: _b, ...copyB } = b
  return shallowEqual(copyA as Record<string, unknown>, copyB as Record<string, unknown>)
}

export class C4Db extends BaseDb {
  protected diagramKind: C4DiagramKind = 'context'
  protected elements: Record<string, C4Element> = {}
  protected boundaries: Record<string, C4Boundary> = {}
  protected relationships: C4Relationship[] = []
  protected elementTags: Record<string, C4ElementTagStyle> = {}
  protected elementStyleOverrides: Record<string, C4ElementStyleOverride> = {}
  protected relationshipTags: Record<string, C4RelationshipTagStyle> = {}
  protected relationshipStyleOverrides: C4RelationshipStyleOverride[] = []
  protected layoutConfig?: C4LayoutConfig
  protected legend = { visible: false }

  setDiagramEntry(entry: string) {
    switch (entry) {
      case 'C4Container':
        this.diagramKind = 'container'
        break
      case 'C4Component':
        this.diagramKind = 'component'
        break
      case 'C4Dynamic':
        this.diagramKind = 'dynamic'
        break
      case 'C4Deployment':
        this.diagramKind = 'deployment'
        break
      case 'C4Context':
      case 'c4Diagram':
        this.diagramKind = 'context'
        break
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

  protected addBoundaryAction(action: C4BoundaryMacroCall, parent?: string): string {
    const boundary = normalizeBoundaryMacro(action.name, action.args, parent)
    this.addBoundary(boundary)

    action.children.forEach(child => {
      if (child.type === 'boundaryMacro') {
        const childId = this.addBoundaryAction(child, boundary.id)
        boundary.children.push(childId)
      } else if (child.type === 'macro') {
        const childId = this.addMacroAction(child, boundary.id)
        if (childId) boundary.children.push(childId)
      } else {
        this.apply(child)
      }
    })

    return boundary.id
  }

  protected addMacroAction(action: C4MacroCall, parent?: string) {
    if (isElementMacro(action.name)) {
      const element = normalizeElementMacro(action.name, action.args, parent)
      this.addElement(element)
      return element.id
    }

    if (isElementTagMacro(action.name)) {
      const tag = normalizeElementTagMacro(action.args)
      this.elementTags[tag.tag] = tag
      return ''
    }

    if (isElementStyleUpdateMacro(action.name)) {
      const override = normalizeElementStyleUpdateMacro(action.args)
      this.elementStyleOverrides[override.elementId] = override
      return ''
    }

    if (isRelationshipTagMacro(action.name)) {
      const tag = normalizeRelationshipTagMacro(action.args)
      this.relationshipTags[tag.tag] = tag
      return ''
    }

    if (isRelationshipStyleUpdateMacro(action.name)) {
      this.relationshipStyleOverrides.push(normalizeRelationshipStyleUpdateMacro(action.args))
      return ''
    }

    if (isLayoutConfigMacro(action.name)) {
      this.layoutConfig = normalizeLayoutConfigMacro(action.args)
      return ''
    }

    if (isLegendMacro(action.name)) {
      this.legend.visible = true
      return ''
    }

    if (isRelationshipMacro(action.name)) {
      const relationship = normalizeRelationshipMacro(
        action.name,
        action.args,
        this.relationships.length,
        Object.keys(this.relationshipTags),
      )
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
    Object.keys(this.elementStyleOverrides).forEach(elementId => {
      if (!this.elements[elementId]) {
        throw new Error(`[c4] UpdateElementStyle target is not declared: ${elementId}`)
      }
    })
    this.relationshipStyleOverrides.forEach(style => {
      if (
        !this.relationships.some(
          rel =>
            (rel.source === style.source && rel.target === style.target) ||
            (rel.bidirectional && rel.source === style.target && rel.target === style.source),
        )
      ) {
        throw new Error(`[c4] UpdateRelStyle target relationship is not declared: ${style.source} -> ${style.target}`)
      }
    })
  }

  getDiagramIR(): C4DiagramIR {
    return {
      diagramKind: this.diagramKind,
      elements: this.elements,
      boundaries: this.boundaries,
      relationships: this.relationships,
      elementTags: this.elementTags,
      elementStyleOverrides: this.elementStyleOverrides,
      relationshipTags: this.relationshipTags,
      relationshipStyleOverrides: this.relationshipStyleOverrides,
      layoutConfig: this.layoutConfig,
      legend: this.legend,
      ...this.getBaseDiagramIR(),
    }
  }

  override clear() {
    super.clear()
    this.diagramKind = 'context'
    this.elements = {}
    this.boundaries = {}
    this.relationships = []
    this.elementTags = {}
    this.elementStyleOverrides = {}
    this.relationshipTags = {}
    this.relationshipStyleOverrides = []
    this.layoutConfig = undefined
    this.legend = { visible: false }
  }
}

const db = new C4Db()

export default db
