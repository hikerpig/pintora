import { SetTitleAction, OverrideConfigAction, ParamAction } from '../util/config'
import { BaseDiagramIR } from '../util/ir'

export type C4DiagramKind = 'context' | 'container' | 'component' | 'dynamic' | 'deployment'

export type C4ElementKind = 'person' | 'system' | 'container' | 'component'

export type C4Shape = 'person' | 'box' | 'database' | 'queue'

export type C4BoundaryKind = 'generic' | 'enterprise' | 'system' | 'container' | 'deploymentNode'

export type C4DirectionHint = 'up' | 'down' | 'left' | 'right' | 'back'

export type C4MacroArg =
  | {
      type: 'positional'
      value: string
    }
  | {
      type: 'named'
      name: string
      value: string
    }

export type C4MacroCall = {
  type: 'macro'
  name: string
  args: C4MacroArg[]
}

export type C4BoundaryMacroCall = {
  type: 'boundaryMacro'
  name: string
  args: C4MacroArg[]
  children: C4Action[]
}

export type C4Element = {
  id: string
  kind: C4ElementKind
  shape: C4Shape
  label: string
  technology?: string
  description?: string
  external?: boolean
  parent?: string
  tags: string[]
  link?: string
  itemId: string
}

export type C4Boundary = {
  id: string
  kind: C4BoundaryKind
  label: string
  type?: string
  description?: string
  parent?: string
  tags: string[]
  link?: string
  children: string[]
  itemId: string
}

export type C4Relationship = {
  source: string
  target: string
  index?: string
  label?: string
  technology?: string
  description?: string
  bidirectional?: boolean
  directionHint?: C4DirectionHint
  tags: string[]
  link?: string
  itemId: string
}

export type C4DiagramIR = BaseDiagramIR & {
  diagramKind: C4DiagramKind
  elements: Record<string, C4Element>
  boundaries: Record<string, C4Boundary>
  relationships: C4Relationship[]
}

export type C4Action = C4MacroCall | C4BoundaryMacroCall | SetTitleAction | OverrideConfigAction | ParamAction
