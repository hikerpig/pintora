# C4 Mermaid Compatibility Follow-Up Spec

## Goal

Close the next compatibility gap between Pintora C4 diagrams and Mermaid 11.15.0 / C4-PlantUML macro syntax without turning Pintora into a PlantUML macro runtime.

This follow-up focuses on syntax and behavior that users are likely to copy from Mermaid or C4-PlantUML examples after the current C4 implementation already supports:

- `C4Context`, `C4Container`, `C4Component`, `C4Dynamic`, `C4Deployment`
- `AddElementTag`, `AddRelTag`
- Explicit generated legends
- Deployment nodes and dynamic relationship indexes

## Scope

### P0: Missing External Shape Variants

Add support for external database and queue element variants listed by Mermaid:

```txt
SystemDb_Ext(alias, label, ?descr, ?sprite, ?tags, $link)
SystemQueue_Ext(alias, label, ?descr, ?sprite, ?tags, $link)
ContainerDb_Ext(alias, label, ?techn, ?descr, ?sprite, ?tags, $link)
ContainerQueue_Ext(alias, label, ?techn, ?descr, ?sprite, ?tags, $link)
ComponentDb_Ext(alias, label, ?techn, ?descr, ?sprite, ?tags, $link)
ComponentQueue_Ext(alias, label, ?techn, ?descr, ?sprite, ?tags, $link)
```

Behavior:

- These macros normalize to the same kind and shape as their non-`_Ext` variants.
- They set `external: true`.
- Rendering uses the existing external visual treatment: external background plus dashed border.

### P0: RelIndex Mermaid Parameter Compatibility

Mermaid documents:

```txt
RelIndex(index, from, to, label, ?tags, $link)
```

Pintora currently accepts `RelIndex(index, from, to, label, techn)` as an implementation convenience. The follow-up should preserve existing behavior while adding Mermaid-compatible tag handling.

Behavior:

- Named `$tags` is always preferred and parsed as relationship tags.
- Named `$techn` remains accepted as Pintora compatibility.
- If the fifth positional argument is present:
  - If it matches a declared relationship tag name or contains comma/plus-separated tag names, treat it as tags.
  - Otherwise treat it as relationship technology for backward compatibility.
- `$link` remains accepted.

Examples:

```txt
AddRelTag("async", $lineColor="#0066cc", $lineStyle=DashedLine())
RelIndex(1, web, api, "Calls", "async")
RelIndex(2, api, db, "Reads", $tags="async")
RelIndex(3, api, web, "Returns", $techn="JSON/HTTPS")
```

### P1: Boundary Type Argument Compatibility

Mermaid documents regular `Boundary` with a type-like third positional argument:

```txt
Boundary(alias, label, ?type, ?tags, $link)
```

Pintora currently treats the third positional argument for non-deployment boundaries as `description`. This follow-up should expose the third positional value as `type` while preserving display behavior.

Behavior:

- For `Boundary`, third positional or named `$type` sets `boundary.type`.
- For `System_Boundary`, `Container_Boundary`, and `Enterprise_Boundary`, named `$type` is accepted as a compatibility extension.
- Existing `$descr` remains accepted and maps to `description`.
- Boundary labels continue to render as `label - type - description` when present.

### P1: UpdateElementStyle

Add parser and renderer support for Mermaid's direct element style update macro:

```txt
UpdateElementStyle(elementName, ?bgColor, ?fontColor, ?borderColor, ?shadowing, ?shape, ?sprite, ?techn, ?legendText, ?legendSprite)
```

Behavior:

- Store updates in IR keyed by element alias.
- Apply updates to the named element after tag style resolution.
- Supported rendered fields:
  - `bgColor`
  - `fontColor`
  - `borderColor`
  - `RoundedBoxShape()`
  - `techn` as a fallback when the element has no technology
- Parsed but not rendered:
  - `shadowing`
  - `sprite`
  - `legendSprite`
  - `EightSidedShape()`
- `UpdateElementStyle` does not create legend entries.
- If the named element does not exist by finalization, throw:

```txt
[c4] UpdateElementStyle target is not declared: <alias>
```

### P1: UpdateRelStyle

Add parser and renderer support for Mermaid's relationship style update macro:

```txt
UpdateRelStyle(from, to, ?textColor, ?lineColor, ?offsetX, ?offsetY)
```

Behavior:

- Store updates in IR keyed by relationship source and target.
- Apply updates to all matching relationships from `from` to `to`.
- Supported rendered fields:
  - `textColor`
  - `lineColor`
- Parsed but initially not rendered:
  - `offsetX`
  - `offsetY`
- `UpdateRelStyle` does not create legend entries.
- If no matching relationship exists by finalization, throw:

```txt
[c4] UpdateRelStyle target relationship is not declared: <from> -> <to>
```

### P1: UpdateLayoutConfig Compatibility

Add parser compatibility for:

```txt
UpdateLayoutConfig(?c4ShapeInRow, ?c4BoundaryInRow)
```

Pintora uses dagre automatic layout, not Mermaid's row-based placement model. The macro should be accepted and stored for future use, but it should not change layout in this follow-up.

Behavior:

- Store values in IR as `layoutConfig?: { c4ShapeInRow?: number; c4BoundaryInRow?: number }`.
- Do not render differently.
- Document that this macro is parsed for compatibility and currently no-op because Pintora uses dagre layout.

## Out Of Scope

- Full PlantUML preprocessing, includes, procedures, and macro expansion.
- Manual layout commands such as `Lay_U`, `Lay_D`, `Lay_L`, and `Lay_R`.
- Sprite rendering.
- Shadow rendering.
- Eight-sided shape rendering.
- Relationship label offset rendering from `UpdateRelStyle`.
- Exact Mermaid row-layout behavior from `UpdateLayoutConfig`.

## IR Changes

Extend `packages/pintora-diagrams/src/c4/type.ts`:

```ts
export type C4ElementStyleOverride = C4ElementTagStyle & {
  elementId: string
}

export type C4RelationshipStyleOverride = {
  source: string
  target: string
  textColor?: string
  lineColor?: string
  offsetX?: string
  offsetY?: string
}

export type C4LayoutConfig = {
  c4ShapeInRow?: number
  c4BoundaryInRow?: number
}

export type C4DiagramIR = BaseDiagramIR & {
  diagramKind: C4DiagramKind
  elements: Record<string, C4Element>
  boundaries: Record<string, C4Boundary>
  relationships: C4Relationship[]
  elementTags: Record<string, C4ElementTagStyle>
  relationshipTags: Record<string, C4RelationshipTagStyle>
  elementStyleOverrides: Record<string, C4ElementStyleOverride>
  relationshipStyleOverrides: C4RelationshipStyleOverride[]
  layoutConfig?: C4LayoutConfig
  legend: C4Legend
}
```

## Style Resolution

The final style priority should be:

```txt
theme/default config
< element kind / external style
< declared tag styles, in $tags order
< UpdateElementStyle / UpdateRelStyle
< explicit element or relationship fields
```

Notes:

- Explicit `technology` on an element or relationship wins over tag or update `techn`.
- Direct updates win over tag colors and shape.
- Multiple tag declarations on an item still resolve in `$tags` order, with later tags overriding earlier ones.

## Documentation Changes

Update `website/docs/diagrams/c4-diagram.mdx`:

- Add `_Ext` database/queue variants to the Supported Macros table.
- Document the `RelIndex` compatibility rule for fifth positional argument.
- Document `Boundary(alias, label, ?type, ?tags, $link)`.
- Add style update macro signatures.
- Mark `UpdateLayoutConfig` as parsed/no-op under layout notes.
- Keep unsupported notes for sprites, shadow rendering, eight-sided shape rendering, relationship offsets, and manual layout statements.

Update `.ai/specs/2026-05-15-c4-diagram-design.md` after implementation so the long-running C4 design reflects the new compatibility layer.

## Acceptance Criteria

- Mermaid examples using the six `_Ext` DB/queue macros parse and render.
- Mermaid examples using `RelIndex(..., "tagName")` apply relationship tag style.
- Regular `Boundary(alias, label, "type")` stores and renders type.
- `UpdateElementStyle` changes an existing element's fill/text/border/rounded shape.
- `UpdateRelStyle` changes matching relationship line and label colors.
- `UpdateLayoutConfig` parses without changing layout or throwing.
- Unknown update targets fail during DB finalization with clear C4 errors.
- Existing C4 parser and artist tests remain green.
