import {
  C4Boundary,
  C4BoundaryKind,
  C4DirectionHint,
  C4Element,
  C4ElementKind,
  C4MacroArg,
  C4Relationship,
  C4Shape,
} from './type'

type ParsedArgs = {
  positional: string[]
  named: Record<string, string>
}

type ElementMacroSpec = {
  kind: C4ElementKind
  shape: C4Shape
  external?: boolean
}

const ELEMENT_MACROS: Record<string, ElementMacroSpec> = {
  Person: { kind: 'person', shape: 'person' },
  Person_Ext: { kind: 'person', shape: 'person', external: true },
  System: { kind: 'system', shape: 'box' },
  System_Ext: { kind: 'system', shape: 'box', external: true },
  SystemDb: { kind: 'system', shape: 'database' },
  SystemQueue: { kind: 'system', shape: 'queue' },
  Container: { kind: 'container', shape: 'box' },
  Container_Ext: { kind: 'container', shape: 'box', external: true },
  ContainerDb: { kind: 'container', shape: 'database' },
  ContainerQueue: { kind: 'container', shape: 'queue' },
  Component: { kind: 'component', shape: 'box' },
  Component_Ext: { kind: 'component', shape: 'box', external: true },
  ComponentDb: { kind: 'component', shape: 'database' },
  ComponentQueue: { kind: 'component', shape: 'queue' },
}

const BOUNDARY_MACROS: Record<string, C4BoundaryKind> = {
  Boundary: 'generic',
  Enterprise_Boundary: 'enterprise',
  System_Boundary: 'system',
  Container_Boundary: 'container',
}

const RELATION_MACROS: Record<string, C4DirectionHint | undefined> = {
  Rel: undefined,
  BiRel: undefined,
  Rel_U: 'up',
  Rel_Up: 'up',
  Rel_D: 'down',
  Rel_Down: 'down',
  Rel_L: 'left',
  Rel_Left: 'left',
  Rel_R: 'right',
  Rel_Right: 'right',
  Rel_Back: 'back',
}

function parseArgs(args: C4MacroArg[]): ParsedArgs {
  const positional: string[] = []
  const named: Record<string, string> = {}

  args.forEach(arg => {
    if (arg.type === 'named') {
      named[arg.name.replace(/^\$/, '')] = arg.value
    } else {
      positional.push(arg.value)
    }
  })

  return { positional, named }
}

function readValue(parsed: ParsedArgs, index: number, name: string) {
  return parsed.named[name] || parsed.positional[index] || ''
}

function readTags(parsed: ParsedArgs) {
  const raw = parsed.named.tags || ''
  if (!raw) return []
  return raw
    .split(/[,+]/)
    .map(tag => tag.trim())
    .filter(Boolean)
}

export function isElementMacro(name: string) {
  return Boolean(ELEMENT_MACROS[name])
}

export function isBoundaryMacro(name: string) {
  return Boolean(BOUNDARY_MACROS[name])
}

export function isRelationshipMacro(name: string) {
  return Object.prototype.hasOwnProperty.call(RELATION_MACROS, name)
}

export function normalizeElementMacro(name: string, args: C4MacroArg[], parent?: string): C4Element {
  const spec = ELEMENT_MACROS[name]
  if (!spec) {
    throw new Error(`[c4] unsupported element macro: ${name}`)
  }

  const parsed = parseArgs(args)
  const id = readValue(parsed, 0, 'alias')
  if (!id) {
    throw new Error(`[c4] ${name} requires an alias as the first argument`)
  }

  const hasTechnology = spec.kind === 'container' || spec.kind === 'component'
  const label = readValue(parsed, 1, 'label') || id
  const technology = hasTechnology ? readValue(parsed, 2, 'techn') : parsed.named.techn || ''
  const description = hasTechnology ? readValue(parsed, 3, 'descr') : readValue(parsed, 2, 'descr')
  const link = parsed.named.link

  const element: C4Element = {
    id,
    kind: spec.kind,
    shape: spec.shape,
    label,
    tags: readTags(parsed),
    itemId: `c4-element-${id}`,
  }

  if (technology) element.technology = technology
  if (description) element.description = description
  if (spec.external) element.external = true
  if (parent) element.parent = parent
  if (link) element.link = link

  return element
}

export function normalizeBoundaryMacro(name: string, args: C4MacroArg[], parent?: string): C4Boundary {
  const kind = BOUNDARY_MACROS[name]
  if (!kind) {
    throw new Error(`[c4] unsupported boundary macro: ${name}`)
  }

  const parsed = parseArgs(args)
  const id = readValue(parsed, 0, 'alias')
  if (!id) {
    throw new Error(`[c4] ${name} requires an alias as the first argument`)
  }

  const label = readValue(parsed, 1, 'label') || id
  const description = readValue(parsed, 2, 'descr')
  const boundary: C4Boundary = {
    id,
    kind,
    label,
    tags: readTags(parsed),
    children: [],
    itemId: `c4-boundary-${id}`,
  }

  if (description) boundary.description = description
  if (parent) boundary.parent = parent
  if (parsed.named.link) boundary.link = parsed.named.link

  return boundary
}

export function normalizeRelationshipMacro(name: string, args: C4MacroArg[], index: number): C4Relationship {
  if (!isRelationshipMacro(name)) {
    throw new Error(`[c4] unsupported relationship macro: ${name}`)
  }

  const parsed = parseArgs(args)
  const source = readValue(parsed, 0, 'from')
  const target = readValue(parsed, 1, 'to')
  if (!source || !target) {
    throw new Error(`[c4] ${name} requires source and target aliases`)
  }

  const label = readValue(parsed, 2, 'label')
  const technology = readValue(parsed, 3, 'techn')
  const description = readValue(parsed, 4, 'descr')
  const directionHint = RELATION_MACROS[name]
  const relationship: C4Relationship = {
    source,
    target,
    tags: readTags(parsed),
    itemId: `c4-rel-${index}`,
  }

  if (label) relationship.label = label
  if (technology) relationship.technology = technology
  if (description) relationship.description = description
  if (name === 'BiRel') relationship.bidirectional = true
  if (directionHint) relationship.directionHint = directionHint
  if (parsed.named.link) relationship.link = parsed.named.link

  return relationship
}
