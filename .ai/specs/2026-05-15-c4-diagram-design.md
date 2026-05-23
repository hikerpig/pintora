# C4 Diagram Design

## Goal

Add a new Pintora diagram type for C4 architecture diagrams, with a macro-first DSL that is familiar to Mermaid C4 and C4-PlantUML users, while keeping Pintora's implementation model parser-driven, theme-aware, and rendered through the existing dagre layout utilities.

The supported C4 surface should make common static and flow/deployment views usable:

- System context diagrams
- Container diagrams
- Component diagrams
- Dynamic diagrams
- Deployment diagrams
- Tag-based styling declarations
- Generated legends

Pintora should remain a parser-driven diagram implementation rather than a PlantUML macro runtime. Compatibility work should focus on Mermaid/C4-PlantUML macro signatures that can be normalized into Pintora-owned IR.

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

Example input:

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

Supported macro families:

- Diagram entries: `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment`, plus `c4Diagram` as Pintora-native alias.
- Elements: `Person`, `Person_Ext`, `System`, `System_Ext`, `SystemDb`, `SystemDb_Ext`, `SystemQueue`, `SystemQueue_Ext`, `Container`, `Container_Ext`, `ContainerDb`, `ContainerDb_Ext`, `ContainerQueue`, `ContainerQueue_Ext`, `Component`, `Component_Ext`, `ComponentDb`, `ComponentDb_Ext`, `ComponentQueue`, `ComponentQueue_Ext`.
- Boundaries: `Boundary`, `Enterprise_Boundary`, `System_Boundary`, `Container_Boundary`, `Deployment_Node`, `Node`, `Node_L`, `Node_R`.
- Relationships: `Rel`, `BiRel`, `Rel_U`, `Rel_Up`, `Rel_D`, `Rel_Down`, `Rel_L`, `Rel_Left`, `Rel_R`, `Rel_Right`, `Rel_Back`, `RelIndex`.
- Styling declarations: `AddElementTag`, `AddRelTag`, `UpdateElementStyle`, `UpdateRelStyle`.
- Layout compatibility metadata: `UpdateLayoutConfig`.
- Legend triggers: `SHOW_LEGEND`, `SHOW_DYNAMIC_LEGEND`, and bare `Legend`.
- Optional arguments: positional arguments for core C4-PlantUML compatibility, plus named arguments for common optional fields such as `$descr`, `$techn`, `$tags`, and `$link`.

Tag style declarations use the Mermaid/C4-PlantUML-compatible signatures:

```txt
AddElementTag(tagStereo, ?bgColor, ?fontColor, ?borderColor, ?shadowing, ?shape, ?sprite, ?techn, ?legendText, ?legendSprite)
AddRelTag(tagStereo, ?textColor, ?lineColor, ?lineStyle, ?sprite, ?techn, ?legendText, ?legendSprite)
UpdateElementStyle(elementName, ?bgColor, ?fontColor, ?borderColor, ?shadowing, ?shape, ?sprite, ?techn, ?legendText, ?legendSprite)
UpdateRelStyle(from, to, ?textColor, ?lineColor, ?offsetX, ?offsetY)
UpdateLayoutConfig(?c4ShapeInRow, ?c4BoundaryInRow)
```

Supported rendered style fields:

- Element tags: `bgColor`, `fontColor`, `borderColor`, `RoundedBoxShape()`, and `techn` when the element does not already define technology.
- Relationship tags: `textColor`, `lineColor`, `SolidLine()`, `DashedLine()`, `DottedLine()`, `BoldLine()`, and `techn` when the relationship does not already define technology.
- Direct update styles: `UpdateElementStyle` overrides matching element tag style fields; `UpdateRelStyle` overrides matching relationship `textColor` and `lineColor`.
- Generated legends use `legendText` when present, otherwise the tag name.

Explicitly out of scope:

- PlantUML preprocessing, includes, defines, procedures, and macro expansion.
- Sprites and icon libraries.
- Shadow rendering for tag declarations.
- Eight-sided element shape rendering, even though `EightSidedShape()` is parsed for forward compatibility.
- `UpdateRelStyle` relationship label offsets, even though `offsetX` and `offsetY` are parsed for compatibility.
- `UpdateLayoutConfig` row layout effects, even though the values are stored as compatibility metadata.
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
  style.ts
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

```txt
/^\s*(c4Diagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)/
```

## Internal Model

Although the user-facing DSL is macro-first, the parser should normalize all input into Pintora-owned C4 IR. This keeps the renderer independent from PlantUML macro behavior and leaves a clean path to model/view syntax later.

Core types:

```ts
type C4DiagramKind = 'context' | 'container' | 'component' | 'dynamic' | 'deployment'

type C4ElementKind = 'person' | 'system' | 'container' | 'component'

type C4Shape = 'person' | 'box' | 'database' | 'queue'

type C4BoundaryKind = 'generic' | 'enterprise' | 'system' | 'container' | 'deploymentNode'

type C4ElementTagShape = 'roundedBox' | 'eightSided'

type C4RelationshipLineStyle = 'solid' | 'dashed' | 'dotted' | 'bold'

type C4ElementTagStyle = {
  tag: string
  bgColor?: string
  fontColor?: string
  borderColor?: string
  shadowing?: string
  shape?: C4ElementTagShape
  sprite?: string
  techn?: string
  legendText?: string
  legendSprite?: string
}

type C4RelationshipTagStyle = {
  tag: string
  textColor?: string
  lineColor?: string
  lineStyle?: C4RelationshipLineStyle
  sprite?: string
  techn?: string
  legendText?: string
  legendSprite?: string
}

type C4ElementStyleOverride = C4ElementTagStyle & {
  elementId: string
}

type C4RelationshipStyleOverride = {
  source: string
  target: string
  textColor?: string
  lineColor?: string
  offsetX?: string
  offsetY?: string
}

type C4LayoutConfig = {
  c4ShapeInRow?: number
  c4BoundaryInRow?: number
}

type C4Legend = {
  visible: boolean
  position: 'right' | 'bottom'
}

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

type C4Relationship = {
  source: string
  target: string
  index?: string
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
  elementTags: Record<string, C4ElementTagStyle>
  elementStyleOverrides: Record<string, C4ElementStyleOverride>
  relationshipTags: Record<string, C4RelationshipTagStyle>
  relationshipStyleOverrides: C4RelationshipStyleOverride[]
  layoutConfig?: C4LayoutConfig
  legend: C4Legend
}
```

`macro.ts` should contain normalization helpers that map macro names and argument lists to these types. Examples:

- `Person_Ext` becomes `{ kind: 'person', shape: 'person', external: true }`.
- `ContainerDb` becomes `{ kind: 'container', shape: 'database' }`; `_Ext` DB/queue variants set `external: true`.
- `SystemQueue` becomes `{ kind: 'system', shape: 'queue' }`.
- `Rel_R` becomes a relationship with `directionHint: 'right'`.
- `BiRel` becomes one bidirectional relationship rather than two independent edges.
- `RelIndex` becomes a relationship with an `index` field that is rendered in the label.
- `Deployment_Node` and `Node` become deployment-node boundaries.
- `AddElementTag` and `AddRelTag` become tag style declarations stored on the IR rather than immediately mutating elements.
- `UpdateElementStyle` and `UpdateRelStyle` become direct style overrides stored on the IR and applied after tag style resolution.
- `UpdateLayoutConfig` becomes layout compatibility metadata stored on the IR. It is not consumed by the dagre artist.
- `SHOW_LEGEND`, `SHOW_DYNAMIC_LEGEND`, and `Legend` set `legend.visible`.

`style.ts` should resolve declared tag styles against individual elements and relationships. Later tags in `$tags` override earlier tags for the same field. A tag's `techn` value is a fallback only; it should not override technology explicitly declared on an element or relationship.

## Parser and DB Behavior

The grammar should parse a restricted macro-call language rather than a full PlantUML language. This keeps error behavior predictable and compatible with Pintora's existing nearley parser workflow.

Parser responsibilities:

- Parse diagram entry and optional `title: ...`.
- Parse macro calls with positional string, identifier, and named arguments.
- Parse color literals such as `#ffdddd`.
- Parse style-helper function values such as `RoundedBoxShape()` and `DashedLine()` as macro argument values.
- Parse boundary blocks with `{ ... }`.
- Parse bare `Legend` as a legend macro.
- Preserve statement order for stable snapshots and relationship index behavior.
- Ignore blank lines and comments using existing shared parser helpers where possible.

DB responsibilities:

- Store elements, boundaries, and relationships.
- Store element tag declarations, relationship tag declarations, and legend visibility.
- Assign `parent` when elements or nested boundaries appear inside a boundary block.
- Fill boundary `children` from nested declarations.
- Reject duplicate aliases only when the duplicate changes semantic identity; repeated equivalent declarations should keep the first declaration.
- Report unresolved relationship endpoints with a parse-time or DB finalization error. Pintora should not silently create unknown elements, because C4 macro users usually expect aliases to be declared explicitly.

Named argument parsing should support both positional and named optional arguments in the same call. Named values override the corresponding optional positional field when both are present.

Legend generation is explicit. Declaring tags does not display a legend by itself; one of `SHOW_LEGEND()`, `SHOW_DYNAMIC_LEGEND()`, or bare `Legend` must be present. The generated legend should include only declared tags that are actually used by elements or relationships.

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

Nested boundaries must render in depth order: outer boundaries first, inner boundaries second, elements last. This prevents parent deployment nodes from covering child deployment nodes.

Legend rendering should run after dagre layout. The legend should be a separate group placed to the right of the graph and included in root bounds. Each row contains a swatch and a text label; row text should use middle baseline alignment so swatches and labels are vertically centered.

## Notation and Theme

The visual notation should follow recognizable C4 conventions without hard-coded colors. All colors should come from `getConfig().themeConfig` or C4 config fields derived from theme variables.

Element layout:

- Header label: bold, centered.
- Technology/type line: optional, rendered as `[Technology]` or `[Type]`.
- Description: optional, wrapped inside the element.
- External elements: same shape family with distinct border or background style.
- Database and queue elements: use existing Pintora symbols where appropriate.
- Element tag styles can override fill, text color, border color, rounded-box radius, and fallback technology.
- Relationship tag styles can override line color, label color, dash pattern, line width for bold lines, and fallback technology.

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

The C4 implementation should avoid adding new global theme variables unless they are clearly shared by other diagrams. A diagram-local config mapped from existing theme variables is enough.

## Documentation

The user documentation should be centered on migration from Mermaid C4 and C4-PlantUML:

- One `C4Context` example.
- One `C4Container` example.
- One `C4Component` example.
- One `C4Dynamic` example.
- One `C4Deployment` example.
- One tag-style and generated-legend example.
- A compatibility table listing supported and unsupported macros.
- A note that Pintora uses dagre automatic layout, so layout may differ from PlantUML and Mermaid.
- A note that sprites, shadow rendering, and eight-sided shape rendering are not supported.
- A note that legends are explicit and only include tags that are actually used.

## Testing

Parser tests:

- Recognizes `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment`, and `c4Diagram`.
- Parses positional arguments for elements and relationships.
- Parses named optional arguments such as `$descr`, `$techn`, `$tags`, `$link`.
- Parses nested boundaries.
- Parses relation direction macros.
- Parses `RelIndex`.
- Parses deployment nodes as nested boundaries.
- Parses `AddElementTag`, `AddRelTag`, style helper function values, colors, and legend aliases.
- Rejects unresolved relationship aliases.

Artist tests:

- Renders one context diagram with person, system, external system, and relationships.
- Renders one container diagram with a system boundary and database.
- Renders one component diagram with a container boundary and components.
- Renders bidirectional relationships distinctly.
- Renders relation labels and technology text.
- Renders dynamic relationship indexes.
- Renders nested deployment boundaries in depth order.
- Applies element tag styles to fill, text color, border color, rounded box shape, and fallback technology.
- Applies relationship tag styles to line color, label color, dash pattern, and fallback technology.
- Renders generated legends for used tags only.
- Vertically centers legend swatches and labels.
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

Milestone 5: dynamic and deployment diagrams.

Milestone 6: tag style declarations and explicit generated legends.

Later milestones can add sprite rendering, shadow rendering, eight-sided element shape rendering, manual layout constraints, and a Structurizr-like model/view layer.

## References

- Pintora diagram convention: `packages/pintora-diagrams/AGENTS.md`
- Existing compound dagre implementation: `packages/pintora-diagrams/src/component/artist.ts`
- Existing dagre wrapper: `packages/pintora-diagrams/src/util/dagre-wrapper.ts`
- Mermaid C4 documentation: https://mermaid.js.org/syntax/c4
- C4-PlantUML README: https://github.com/plantuml-stdlib/C4-PlantUML/blob/master/README.md
- Structurizr DSL language reference: https://docs.structurizr.com/dsl/language
- LikeC4 views documentation: https://likec4.dev/dsl/views/
