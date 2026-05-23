import {
  C4Boundary,
  C4BoundaryKind,
  C4DirectionHint,
  C4Element,
  C4ElementKind,
  C4ElementStyleOverride,
  C4ElementTagShape,
  C4ElementTagStyle,
  C4LayoutConfig,
  C4MacroArg,
  C4Relationship,
  C4RelationshipLineStyle,
  C4RelationshipStyleOverride,
  C4RelationshipTagStyle,
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

type BoundaryMacroSpec = {
  kind: C4BoundaryKind
  hasDeploymentNodeArgs?: boolean
}

const ELEMENT_MACROS: Record<string, ElementMacroSpec> = {
  Person: { kind: 'person', shape: 'person' },
  Person_Ext: { kind: 'person', shape: 'person', external: true },
  System: { kind: 'system', shape: 'box' },
  System_Ext: { kind: 'system', shape: 'box', external: true },
  SystemDb: { kind: 'system', shape: 'database' },
  SystemDb_Ext: { kind: 'system', shape: 'database', external: true },
  SystemQueue: { kind: 'system', shape: 'queue' },
  SystemQueue_Ext: { kind: 'system', shape: 'queue', external: true },
  Container: { kind: 'container', shape: 'box' },
  Container_Ext: { kind: 'container', shape: 'box', external: true },
  ContainerDb: { kind: 'container', shape: 'database' },
  ContainerDb_Ext: { kind: 'container', shape: 'database', external: true },
  ContainerQueue: { kind: 'container', shape: 'queue' },
  ContainerQueue_Ext: { kind: 'container', shape: 'queue', external: true },
  Component: { kind: 'component', shape: 'box' },
  Component_Ext: { kind: 'component', shape: 'box', external: true },
  ComponentDb: { kind: 'component', shape: 'database' },
  ComponentDb_Ext: { kind: 'component', shape: 'database', external: true },
  ComponentQueue: { kind: 'component', shape: 'queue' },
  ComponentQueue_Ext: { kind: 'component', shape: 'queue', external: true },
}

const BOUNDARY_MACROS: Record<string, BoundaryMacroSpec> = {
  Boundary: { kind: 'generic' },
  Enterprise_Boundary: { kind: 'enterprise' },
  System_Boundary: { kind: 'system' },
  Container_Boundary: { kind: 'container' },
  Deployment_Node: { kind: 'deploymentNode', hasDeploymentNodeArgs: true },
  Node: { kind: 'deploymentNode', hasDeploymentNodeArgs: true },
  Node_L: { kind: 'deploymentNode', hasDeploymentNodeArgs: true },
  Node_R: { kind: 'deploymentNode', hasDeploymentNodeArgs: true },
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
  RelIndex: undefined,
}

const ELEMENT_TAG_SHAPES: Record<string, C4ElementTagShape> = {
  RoundedBoxShape: 'roundedBox',
  'RoundedBoxShape()': 'roundedBox',
  EightSidedShape: 'eightSided',
  'EightSidedShape()': 'eightSided',
}

const RELATION_TAG_LINE_STYLES: Record<string, C4RelationshipLineStyle> = {
  SolidLine: 'solid',
  'SolidLine()': 'solid',
  DashedLine: 'dashed',
  'DashedLine()': 'dashed',
  DottedLine: 'dotted',
  'DottedLine()': 'dotted',
  BoldLine: 'bold',
  'BoldLine()': 'bold',
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

function readTags(parsed: ParsedArgs, rawOverride?: string) {
  const raw = rawOverride || parsed.named.tags || ''
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

export function isElementTagMacro(name: string) {
  return name === 'AddElementTag'
}

export function isElementStyleUpdateMacro(name: string) {
  return name === 'UpdateElementStyle'
}

export function isRelationshipTagMacro(name: string) {
  return name === 'AddRelTag'
}

export function isRelationshipStyleUpdateMacro(name: string) {
  return name === 'UpdateRelStyle'
}

export function isLegendMacro(name: string) {
  return name === 'SHOW_LEGEND' || name === 'SHOW_DYNAMIC_LEGEND' || name === 'Legend'
}

export function isLayoutConfigMacro(name: string) {
  return name === 'UpdateLayoutConfig'
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
  const spec = BOUNDARY_MACROS[name]
  if (!spec) {
    throw new Error(`[c4] unsupported boundary macro: ${name}`)
  }

  const parsed = parseArgs(args)
  const id = readValue(parsed, 0, 'alias')
  if (!id) {
    throw new Error(`[c4] ${name} requires an alias as the first argument`)
  }

  const label = readValue(parsed, 1, 'label') || id
  const type =
    spec.hasDeploymentNodeArgs || name === 'Boundary' ? readValue(parsed, 2, 'type') : parsed.named.type || ''
  const description =
    spec.hasDeploymentNodeArgs || name === 'Boundary' ? readValue(parsed, 3, 'descr') : readValue(parsed, 2, 'descr')
  const boundary: C4Boundary = {
    id,
    kind: spec.kind,
    label,
    tags: readTags(parsed),
    children: [],
    itemId: `c4-boundary-${id}`,
  }

  if (type) boundary.type = type
  if (description) boundary.description = description
  if (parent) boundary.parent = parent
  if (parsed.named.link) boundary.link = parsed.named.link

  return boundary
}

export function normalizeRelationshipMacro(
  name: string,
  args: C4MacroArg[],
  index: number,
  knownRelationshipTags: string[] = [],
): C4Relationship {
  if (!isRelationshipMacro(name)) {
    throw new Error(`[c4] unsupported relationship macro: ${name}`)
  }

  const parsed = parseArgs(args)
  const isIndexed = name === 'RelIndex'
  const source = isIndexed ? readValue(parsed, 1, 'from') : readValue(parsed, 0, 'from')
  const target = isIndexed ? readValue(parsed, 2, 'to') : readValue(parsed, 1, 'to')
  if (!source || !target) {
    throw new Error(`[c4] ${name} requires source and target aliases`)
  }

  const label = isIndexed ? readValue(parsed, 3, 'label') : readValue(parsed, 2, 'label')
  const relIndexFifth = isIndexed ? parsed.positional[4] || '' : ''
  const relIndexTags =
    isIndexed && relIndexFifth && relIndexFifth.split(/[,+]/).some(tag => knownRelationshipTags.includes(tag.trim()))
      ? relIndexFifth
      : ''
  const rawTags = parsed.named.tags || relIndexTags
  const technology = isIndexed
    ? relIndexTags
      ? readValue(parsed, 5, 'techn')
      : readValue(parsed, 4, 'techn')
    : readValue(parsed, 3, 'techn')
  const description = isIndexed
    ? relIndexTags
      ? readValue(parsed, 6, 'descr')
      : readValue(parsed, 5, 'descr')
    : readValue(parsed, 4, 'descr')
  const directionHint = RELATION_MACROS[name]
  const relationship: C4Relationship = {
    source,
    target,
    tags: readTags(parsed, rawTags),
    itemId: `c4-rel-${index}`,
  }

  if (isIndexed) relationship.index = readValue(parsed, 0, 'index')
  if (label) relationship.label = label
  if (technology) relationship.technology = technology
  if (description) relationship.description = description
  if (name === 'BiRel') relationship.bidirectional = true
  if (directionHint) relationship.directionHint = directionHint
  if (parsed.named.link) relationship.link = parsed.named.link

  return relationship
}

export function normalizeElementTagMacro(args: C4MacroArg[]): C4ElementTagStyle {
  const parsed = parseArgs(args)
  const tag = readValue(parsed, 0, 'tagStereo') || readValue(parsed, 0, 'tag')
  if (!tag) {
    throw new Error('[c4] AddElementTag requires a tag name as the first argument')
  }

  const shapeValue = readValue(parsed, 5, 'shape')
  const style: C4ElementTagStyle = {
    tag,
  }

  const bgColor = readValue(parsed, 1, 'bgColor')
  const fontColor = readValue(parsed, 2, 'fontColor')
  const borderColor = readValue(parsed, 3, 'borderColor')
  const shadowing = readValue(parsed, 4, 'shadowing')
  const sprite = readValue(parsed, 6, 'sprite')
  const techn = readValue(parsed, 7, 'techn')
  const legendText = readValue(parsed, 8, 'legendText')
  const legendSprite = readValue(parsed, 9, 'legendSprite')

  if (bgColor) style.bgColor = bgColor
  if (fontColor) style.fontColor = fontColor
  if (borderColor) style.borderColor = borderColor
  if (shadowing) style.shadowing = shadowing
  if (shapeValue && ELEMENT_TAG_SHAPES[shapeValue]) style.shape = ELEMENT_TAG_SHAPES[shapeValue]
  if (sprite) style.sprite = sprite
  if (techn) style.techn = techn
  if (legendText) style.legendText = legendText
  if (legendSprite) style.legendSprite = legendSprite

  return style
}

export function normalizeElementStyleUpdateMacro(args: C4MacroArg[]): C4ElementStyleOverride {
  const parsed = parseArgs(args)
  const elementId = readValue(parsed, 0, 'elementName')
  if (!elementId) {
    throw new Error('[c4] UpdateElementStyle requires an element alias as the first argument')
  }

  const { tag: _tag, ...tagStyle } = normalizeElementTagMacro([
    { type: 'positional', value: elementId },
    ...args.slice(1),
  ])
  return { ...tagStyle, elementId }
}

export function normalizeRelationshipTagMacro(args: C4MacroArg[]): C4RelationshipTagStyle {
  const parsed = parseArgs(args)
  const tag = readValue(parsed, 0, 'tagStereo') || readValue(parsed, 0, 'tag')
  if (!tag) {
    throw new Error('[c4] AddRelTag requires a tag name as the first argument')
  }

  const lineStyleValue = readValue(parsed, 3, 'lineStyle')
  const style: C4RelationshipTagStyle = {
    tag,
  }

  const textColor = readValue(parsed, 1, 'textColor')
  const lineColor = readValue(parsed, 2, 'lineColor')
  const sprite = readValue(parsed, 4, 'sprite')
  const techn = readValue(parsed, 5, 'techn')
  const legendText = readValue(parsed, 6, 'legendText')
  const legendSprite = readValue(parsed, 7, 'legendSprite')

  if (textColor) style.textColor = textColor
  if (lineColor) style.lineColor = lineColor
  if (lineStyleValue && RELATION_TAG_LINE_STYLES[lineStyleValue]) {
    style.lineStyle = RELATION_TAG_LINE_STYLES[lineStyleValue]
  }
  if (sprite) style.sprite = sprite
  if (techn) style.techn = techn
  if (legendText) style.legendText = legendText
  if (legendSprite) style.legendSprite = legendSprite

  return style
}

export function normalizeRelationshipStyleUpdateMacro(args: C4MacroArg[]): C4RelationshipStyleOverride {
  const parsed = parseArgs(args)
  const source = readValue(parsed, 0, 'from')
  const target = readValue(parsed, 1, 'to')
  if (!source || !target) {
    throw new Error('[c4] UpdateRelStyle requires source and target aliases')
  }

  const style: C4RelationshipStyleOverride = {
    source,
    target,
  }
  const textColor = readValue(parsed, 2, 'textColor')
  const lineColor = readValue(parsed, 3, 'lineColor')
  const offsetX = readValue(parsed, 4, 'offsetX')
  const offsetY = readValue(parsed, 5, 'offsetY')

  if (textColor) style.textColor = textColor
  if (lineColor) style.lineColor = lineColor
  if (offsetX) style.offsetX = offsetX
  if (offsetY) style.offsetY = offsetY

  return style
}

export function normalizeLayoutConfigMacro(args: C4MacroArg[]): C4LayoutConfig {
  const parsed = parseArgs(args)
  const shape = readValue(parsed, 0, 'c4ShapeInRow')
  const boundary = readValue(parsed, 1, 'c4BoundaryInRow')
  return {
    ...(shape ? { c4ShapeInRow: Number(shape) } : {}),
    ...(boundary ? { c4BoundaryInRow: Number(boundary) } : {}),
  }
}
