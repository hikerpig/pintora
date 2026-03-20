# Design: Use Case Diagram Implementation

## 1. Architecture Design

### 1.1 Directory Structure

Follows pintora's standard diagram implementation structure:

```
packages/pintora-diagrams/src/usecase/
├── index.ts              # Diagram registration entry
├── db.ts                 # Data model and IR definition
├── parser.ts             # Parser entry
├── parser/
│   └── useCaseDiagram.ne # Nearley grammar definition
├── artist.ts             # Renderer implementation
├── config.ts             # Configuration and theme integration
└── event-recognizer.ts   # Interactive event support (optional)
```

### 1.2 Registration

Use `defineDiagram` to register the diagram type, matching pattern `/^\s*useCaseDiagram/`

## 2. DSL Design

### 2.1 Syntax Specification (PlantUML compatible)

```
useCaseDiagram
  title "Online Shopping System"

  # Actor definitions
  actor Customer as C
  actor "Store Staff" as S
  actor "Payment System" as P <<System>>

  # Use case definitions
  (Browse Products) as B
  (Add to Cart)
  usecase "Process Payment" as PP <<Required>>

  # System boundary
  rectangle "E-Commerce Platform" {
    (Browse Products)
    (Add to Cart)
    (Checkout)
  }

  # Relationships
  C --> (Browse Products)
  C --> (Add to Cart)
  C --> (Checkout)
  S --> (Manage Inventory)

  # Include relationship
  (Checkout) ..> (Process Payment) : include

  # Extend relationship
  (Checkout) <.. (Apply Discount) : extend

  # Generalization relationship
  (Credit Card Payment) <|-- (Process Payment)
  (PayPal Payment) <|-- (Process Payment)

  # Notes
  note right of (Checkout)
    Main checkout flow for customers
    Supports multiple payment methods
  end note
```

### 2.2 Key Syntax

| Syntax                                                           | Usage                    |
| ---------------------------------------------------------------- | ------------------------ | ----------------------------------------- |
| `actor <name> [as <alias>] [<<stereotype>>]`                     | Define actor             |
| `(<name>) [as <alias>] [<<stereotype>>]` or `usecase <name> ...` | Define use case          |
| `rectangle <name> { ... }` or `package <name> { ... }`           | Define system boundary   |
| `-->`                                                            | Association relationship |
| `..> : include`                                                  | Include relationship     |
| `<.. : extend`                                                   | Extend relationship      |
| `<                                                               | --`                      | Generalization (inheritance) relationship |
| `title <text>`                                                   | Diagram title            |
| `note <position> of <target> : <text>`                           | Add note                 |

## 3. Data Model (IR)

```typescript
// db.ts
import { BaseDb, BaseDiagramIR } from '@pintora/core'

export enum RelationType {
  ASSOCIATION = 'ASSOCIATION',
  INCLUDE = 'INCLUDE',
  EXTEND = 'EXTEND',
  GENERALIZATION = 'GENERALIZATION',
}

export interface Actor {
  id: string
  name: string
  alias?: string
  stereotype?: string
}

export interface UseCase {
  id: string
  name: string
  alias?: string
  stereotype?: string
  boundaryId?: string
}

export interface SystemBoundary {
  id: string
  name: string
  type: 'rectangle' | 'package'
  useCaseIds: string[]
}

export interface Relation {
  id: string
  from: string
  to: string
  type: RelationType
  label?: string
}

export interface Note {
  id: string
  targetId: string
  position: 'left' | 'right' | 'top' | 'bottom'
  text: string
}

export interface UseCaseDiagramIR extends BaseDiagramIR {
  actors: Record<string, Actor>
  useCases: Record<string, UseCase>
  systemBoundaries: Record<string, SystemBoundary>
  relations: Relation[]
  notes: Note[]
  title?: string
}

export class UseCaseDb extends BaseDb<UseCaseDiagramIR> {
  // implementation
}
```

## 4. Rendering Design

### 4.1 Element Rendering

| Element         | Implementation Approach                                                                                                                                                                                    | Reuse Source                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Actor           | Draw human-shaped icon, support stereotype text                                                                                                                                                            | Reuse sequence diagram's `drawActor` method directly    |
| Use Case        | Draw ellipse with centered text, auto-resize based on content                                                                                                                                              | Use native ellipse rendering API                        |
| System Boundary | Draw rectangle with title at top, contain inner use cases                                                                                                                                                  | Reuse ER diagram's Dagre Cluster implementation         |
| Relationships   | <ul><li>Association: solid line with open arrow</li><li>Include/Extend: dashed line with open arrow + <<include>>/<<extend>> label</li><li>Generalization: solid line with hollow triangle arrow</li></ul> | Reuse class diagram's relationship line rendering logic |
| Notes           | Draw rectangle with folded corner, support multi-line text                                                                                                                                                 | Reuse common note component                             |

### 4.2 Layout

Use existing Dagre layout engine (same as ER diagram):

- System boundaries as Dagre Cluster nodes
- Automatic node positioning based on relationship connections
- Support both TB (top to bottom) and LR (left to right) layout directions
- Configurable node spacing and rank spacing

## 5. Configuration Design

```typescript
// config.ts
import { BaseFontConfig, makeConfigurator } from '@pintora/core'

export interface UseCaseConf extends BaseFontConfig {
  diagramPadding: number

  // Layout
  layoutDirection: 'TB' | 'LR'
  ranksep: number
  nodesep: number

  // Actor style
  actorWidth: number
  actorHeight: number
  actorBackground: string
  actorBorderColor: string
  actorBorderWidth: number
  actorTextColor: string

  // Use case style
  usecasePadding: number
  usecaseBackground: string
  usecaseBorderColor: string
  usecaseBorderWidth: number
  usecaseTextColor: string
  usecaseCornerRadius: number

  // System boundary style
  boundaryPadding: number
  boundaryBackground: string
  boundaryBorderColor: string
  boundaryBorderWidth: number
  boundaryTitleColor: string

  // Relationship style
  lineWidth: number
  arrowSize: number
  associationColor: string
  includeColor: string
  extendColor: string
  generalizationColor: string
}

export const defaultUseCaseConf: UseCaseConf = {
  // default values
}

export const useCaseConfigurator = makeConfigurator<UseCaseConf>('usecaseDiagram', defaultUseCaseConf)
```

## 6. Compatibility

- Full syntax compatibility with PlantUML use case diagrams for core features
- Theme system compatibility: all styles inherit from global theme settings
- Configuration system compatibility: supports both global and diagram-specific configuration
- Output compatibility: supports both SVG and Canvas rendering, same as other diagram types
