# C4 Diagram Design

## Goal

Add a new Pintora diagram type for C4 architecture diagrams, with a macro-first DSL that is familiar to Mermaid C4 and C4-PlantUML users, while keeping Pintora's implementation model parser-driven, theme-aware, and rendered through the existing dagre layout utilities.

The first release should make common static C4 diagrams usable:

- System context diagrams
- Container diagrams
- Component diagrams

Dynamic and deployment diagrams are intentionally deferred so the first release does not become a PlantUML macro runtime.

## User-Facing DSL

The primary syntax is C4 macro style. The diagram detector should recognize these entry points:

```txt
c4Diagram
C4Context
C4Container
C4Component
C4Dynamic
C4Deployment
```

`C4Dynamic` and `C4Deployment` can be detected in the grammar only when useful for clear "not supported yet" errors, but they are not part of the first supported rendering scope.

Example first-release input:

```txt
C4Container
title: Internet Banking - Containers

Person(customer, "Customer", "A retail banking customer")
System_Boundary(banking, "Internet Banking System") {
  Container(web, "Web Application", "React", "Delivers the single-page app")
  Container(api, "API Application", "Spring Boot", "Handles business requests")
  ContainerDb(db, "Database", "PostgreSQL", "Stores account data")
}
System_Ext(email, "E-mail System", "Sends notifications")

Rel(customer, web, "Uses", "HTTPS")
Rel(web, api, "Calls", "JSON/HTTPS")
Rel(api, db, "Reads/Writes", "JDBC")
Rel(api, email, "Sends messages", "SMTP")
```

Supported macro families in the first release:

- Diagram entries: `C4Context`, `C4Container`, `C4Component`, plus `c4Diagram` as Pintora-native alias.
- Elements: `Person`, `Person_Ext`, `System`, `System_Ext`, `SystemDb`, `SystemQueue`, `Container`, `Container_Ext`, `ContainerDb`, `ContainerQueue`, `Component`, `Component_Ext`, `ComponentDb`, `ComponentQueue`.
- Boundaries: `Boundary`, `Enterprise_Boundary`, `System_Boundary`, `Container_Boundary`.
- Relationships: `Rel`, `BiRel`, `Rel_U`, `Rel_Up`, `Rel_D`, `Rel_Down`, `Rel_L`, `Rel_Left`, `Rel_R`, `Rel_Right`, `Rel_Back`.
- Optional arguments: positional arguments for core C4-PlantUML compatibility, plus named arguments for common optional fields such as `$descr`, `$techn`, `$tags`, and `$link`.

Explicitly out of scope for the first release:

- PlantUML preprocessing, includes, defines, procedures, and macro expansion.
- Sprites and icon libraries.
- Legend generation.
- Full custom tag style declarations such as `AddElementTag` and `AddRelTag`.
- Manual layout commands such as `Lay_U`, except as a later best-effort constraint feature.
- Sequence-style C4 diagrams.

## Architecture

The implementation should follow the existing Pintora diagram convention in `packages/pintora-diagrams`: parser, database, artist, config, and index files live together under one diagram directory.

Proposed files:

```txt
packages/pintora-diagrams/src/c4/
  index.ts
  parser/c4Diagram.ne
  parser.ts
  db.ts
  type.ts
  macro.ts
  artist.ts
  config.ts
  notation.ts
```

Repository integration:

```txt
packages/pintora-diagrams/src/index.ts
packages/pintora-standalone/src/index.ts
website/docs/diagrams/c4-diagram.mdx
packages/pintora-diagrams/src/__tests__/c4-parser.spec.ts
packages/pintora-diagrams/src/__tests__/c4-artist.spec.ts
```

The diagram should register as `c4Diagram` and use a pattern that matches macro-style entries:

```ts
/^\s*(c4Diagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)/
```

## Internal Model

Although the user-facing DSL is macro-first, the parser should normalize all input into Pintora-owned C4 IR. This keeps the renderer independent from PlantUML macro behavior and leaves a clean path to model/view syntax later.

Core types:

```ts
type C4DiagramKind = 'context' | 'container' | 'component'

type C4ElementKind = 'person' | 'system' | 'container' | 'component'

type C4Shape = 'person' | 'box' | 'database' | 'queue'

type C4Element = {
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

type C4Boundary = {
  id: string
  kind: 'generic' | 'enterprise' | 'system' | 'container'
  label: string
  description?: string
  parent?: string
  tags: string[]
  link?: string
  children: string[]
  itemId: string
}

type C4Relationship = {
  source: string
  target: string
  label?: string
  technology?: string
  description?: string
  bidirectional?: boolean
  directionHint?: 'up' | 'down' | 'left' | 'right' | 'back'
  tags: string[]
  link?: string
  itemId: string
}

type C4DiagramIR = BaseDiagramIR & {
  diagramKind: C4DiagramKind
  elements: Record<string, C4Element>
  boundaries: Record<string, C4Boundary>
  relationships: C4Relationship[]
}
```

`macro.ts` should contain normalization helpers that map macro names and argument lists to these types. Examples:

- `Person_Ext` becomes `{ kind: 'person', shape: 'person', external: true }`.
- `ContainerDb` becomes `{ kind: 'container', shape: 'database' }`.
- `SystemQueue` becomes `{ kind: 'system', shape: 'queue' }`.
- `Rel_R` becomes a relationship with `directionHint: 'right'`.
- `BiRel` becomes one bidirectional relationship rather than two independent edges.

## Parser and DB Behavior

The grammar should parse a restricted macro-call language rather than a full PlantUML language. This keeps error behavior predictable and compatible with Pintora's existing nearley parser workflow.

Parser responsibilities:

- Parse diagram entry and optional `title: ...`.
- Parse macro calls with positional string, identifier, and named arguments.
- Parse boundary blocks with `{ ... }`.
- Preserve statement order for stable snapshots and relationship index behavior.
- Ignore blank lines and comments using existing shared parser helpers where possible.

DB responsibilities:

- Store elements, boundaries, and relationships.
- Assign `parent` when elements or nested boundaries appear inside a boundary block.
- Fill boundary `children` from nested declarations.
- Reject duplicate aliases only when the duplicate changes semantic identity; repeated equivalent declarations should keep the first declaration.
- Report unresolved relationship endpoints with a parse-time or DB finalization error. First release should not silently create unknown elements, because C4 macro users usually expect aliases to be declared explicitly.

Named argument parsing should support both positional and named optional arguments in the same call. Named values override the corresponding optional positional field when both are present.

## Rendering and Layout

The artist should use the same general flow as existing dagre-based diagrams:

1. Create a directed compound layout graph with `createLayoutGraph`.
2. Create marks for elements and boundaries.
3. Add dagre nodes for elements and boundary containers.
4. Set parent relationships for compound layout.
5. Add relationship edges.
6. Run `DagreWrapper.doLayout()`.
7. Apply node and edge layout callbacks.
8. Adjust root bounds and title using existing artist utilities.

Layout default:

- All C4 diagram kinds default to top-to-bottom (`TB`) unless overridden by config.

Relationship direction hints should be best-effort. They can influence graph constraints or rank direction later, but the first implementation should not promise exact PlantUML placement equivalence.

Boundary rendering should reuse the compound graph pattern already used by component and dot diagrams. Parent-child relationship edges are a known dagre risk in compound graphs, so C4 should copy the component diagram's strategy: detect edges between a child and its containing boundary, skip them during dagre layout when necessary, then draw them manually after layout.

## Notation and Theme

The visual notation should follow recognizable C4 conventions without hard-coded colors. All colors should come from `getConfig().themeConfig` or C4 config fields derived from theme variables.

Element layout:

- Header label: bold, centered.
- Technology/type line: optional, rendered as `[Technology]` or `[Type]`.
- Description: optional, wrapped inside the element.
- External elements: same shape family with distinct border or background style.
- Database and queue elements: use existing Pintora symbols where appropriate.

Config fields:

```ts
type C4Conf = BaseFontConfig & {
  diagramPadding: number
  layoutDirection: 'TB' | 'BT' | 'LR' | 'RL'
  edgeType: EdgeType
  nodesep: number
  edgesep: number
  ranksep: number
  elementPadding: number
  boundaryPadding: number
  personBackground: string
  systemBackground: string
  containerBackground: string
  componentBackground: string
  externalBackground: string
  boundaryBackground: string
  boundaryBorderColor: string
  relationLineColor: string
  labelBackground: string
  textColor: string
  lineWidth: number
  useMaxWidth: boolean
}
```

The first release should avoid adding new global theme variables unless they are clearly shared by other diagrams. A diagram-local config mapped from existing theme variables is enough.

## Documentation

The user documentation should be centered on migration from Mermaid C4 and C4-PlantUML:

- One `C4Context` example.
- One `C4Container` example.
- One `C4Component` example.
- A compatibility table listing supported and unsupported macros.
- A note that Pintora uses dagre automatic layout, so layout may differ from PlantUML and Mermaid.
- A note that sprites, legends, and full tag styling are not supported in the first release.

## Testing

Parser tests:

- Recognizes `C4Context`, `C4Container`, `C4Component`, and `c4Diagram`.
- Parses positional arguments for elements and relationships.
- Parses named optional arguments such as `$descr`, `$techn`, `$tags`, `$link`.
- Parses nested boundaries.
- Parses relation direction macros.
- Rejects unresolved relationship aliases.

Artist tests:

- Renders one context diagram with person, system, external system, and relationships.
- Renders one container diagram with a system boundary and database.
- Renders one component diagram with a container boundary and components.
- Renders bidirectional relationships distinctly.
- Renders relation labels and technology text.
- Produces stable snapshots without updating snapshots blindly.

Verification commands:

```bash
pnpm --filter @pintora/diagrams gen-parser
pnpm --filter @pintora/diagrams test -- c4
pnpm compile
pnpm ai:lint
```

Snapshot diffs require human review before commit.

## Rollout

Milestone 1: parser, DB, macro normalization, and parser tests.

Milestone 2: static artist for elements, boundaries, relationships, and dagre layout.

Milestone 3: config, theme mapping, docs, and standalone registration.

Milestone 4: compatibility polish for named arguments, external variants, and relation direction hints.

Later milestones can add deployment diagrams, dynamic diagrams, tag style definitions, legend generation, and a Structurizr-like model/view layer.

## References

- Pintora diagram convention: `packages/pintora-diagrams/AGENTS.md`
- Existing compound dagre implementation: `packages/pintora-diagrams/src/component/artist.ts`
- Existing dagre wrapper: `packages/pintora-diagrams/src/util/dagre-wrapper.ts`
- Mermaid C4 documentation: https://mermaid.js.org/syntax/c4
- C4-PlantUML README: https://github.com/plantuml-stdlib/C4-PlantUML/blob/master/README.md
- Structurizr DSL language reference: https://docs.structurizr.com/dsl/language
- LikeC4 views documentation: https://likec4.dev/dsl/views/
