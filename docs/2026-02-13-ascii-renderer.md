# Pintora ASCII Renderer Archive

## Status

This document is an archived summary of the Unicode ASCII renderer work. It is no longer a forward-looking requirements doc. The renderer is already in active use, and the main value of this file is:

- recording the architecture that actually shipped
- listing the regressions that shaped the design
- pointing to the code and tests that now define behavior

## What Shipped

The current ASCII renderer is a semantic, grid-based text renderer built on top of `GraphicsIR`. It does not try to reproduce SVG pixel-for-pixel. Instead, it preserves structure, labels, and endpoint meaning through a normalization and rasterization pipeline.

Core outcomes:

- Unicode box-drawing output is stable enough for regression testing
- text placement is grid-aware instead of relying on fragile pixel rounding
- connectors can render compact semantic markers instead of sampled path noise
- selected symbols and frames can render reviewed compact glyphs/templates
- SVG and Canvas geometry remain the source of truth; ASCII adds renderer-specific degradation rules

## Architecture Snapshot

Pipeline:

```text
Graphics IR
  -> mark-walker
  -> semantic draw ops
  -> normalize-ops
  -> rasterizer
  -> TextGrid
  -> plain text
```

Key files:

| Area | File |
|------|------|
| renderer entry | `packages/pintora-renderer/src/renderers/AsciiRenderer.ts` |
| mark collection | `packages/pintora-renderer/src/renderers/ascii/mark-walker.ts` |
| normalization | `packages/pintora-renderer/src/renderers/ascii/normalize-ops.ts` |
| glyph merge | `packages/pintora-renderer/src/renderers/ascii/glyph.ts` |
| connector glyphs | `packages/pintora-renderer/src/renderers/ascii/connector-glyphs.ts` |
| symbol glyphs | `packages/pintora-renderer/src/renderers/ascii/symbol-glyphs.ts` |
| frame glyphs | `packages/pintora-renderer/src/renderers/ascii/frame-glyphs.ts` |
| rasterization | `packages/pintora-renderer/src/renderers/ascii/rasterizer.ts` |

Rendering layers:

1. background
2. lines
3. markers
4. text

## Semantic Contract

ASCII quality depends on artists emitting semantics instead of only geometry.

### Roles

| Role | Purpose |
|------|---------|
| `container` | text-bearing bounded region with inner rows and cols |
| `backdrop` | clears lower content and may define a text region |
| `separator` | line that text should avoid |
| `decoration` | optional visual accent |
| `connector` | shaft whose endpoints carry meaning |
| `symbol` | compact semantic symbol with geometric fallback |

### Semantic Extensions

`MarkSemantic` currently matters in three places:

- `connector`: compact arrows and ER cardinality markers
- `symbol`: compact activity, component, and ER inheritance symbols
- `frame`: compact note and decision frame rendering
- `text`: low-fidelity text visibility hints

Recent practical additions:

- `er-relationship` vertical connectors now reserve external space before drawing compact markers
- connector layout hints are now part of `ConnectorSemantic` instead of being inferred from `family`
- `compactEndpointClearance` controls whether compact endpoints must sit outside container borders on the horizontal axis, vertical axis, or both
- `compactEndpointClearanceMode` controls whether endpoint clearance must succeed on both sides or may still apply when only one side touches a semantic container
- `compactLaneReservation` controls whether normalization may reserve extra external lanes before compact connector rendering
- `er-inheritance-triangle` now uses `symbol.direction` so ASCII preserves triangle orientation instead of always drawing a fixed `△`
- `text.lowFidelityVisibility` lets diagram artists explicitly omit labels that would damage low-fidelity output instead of teaching the renderer diagram-specific class rules

## Important Regressions That Shaped The Design

### 1. Text-on-border collisions

Sequence dividers, actor labels, class members, and ER titles/comments could land on the same row as borders or separators after naive pixel-to-grid rounding.

What changed:

- text placement is resolved in renderer space
- semantic containers define legal text regions
- separators are snapped before text is placed
- text is clamped off border rows where possible

### 2. ER header/body and shared-border instability

ER entities exposed a failure mode where title rows, header separators, comments, and adjacent attribute cells all competed for the same snapped grid rows and borders.

What changed:

- ER artists emit more useful semantic structure
- container snapping happens in ASCII normalization only
- shared borders are coordinated globally to avoid doubled borders like `││`

### 3. Connector marker distortion

Sequence arrows and ER cardinality markers were unreadable when rendered as sampled geometry.

What changed:

- semantics moved onto the connector shaft
- ASCII collects `ConnectorOp` instead of blindly flattening endpoints
- horizontal and vertical compact templates are handled separately
- connector spacing policy is now declared explicitly in semantics, instead of hard-coding renderer behavior from connector family alone

Examples of compact output:

- sequence: `▶`, `▷`, `◀`, `◁`, `╌`
- ER LR: `│`, `○│`, `╟`, `╢`, `○╟`, `○╢`
- ER TD: `─`, `○─`, `╤`, `╧`, `○╤`, `○╧`

### 4. Frame meaning lost in low fidelity

Notes and activity decision bodies looked like ordinary boxes once color and exact geometry were gone.

What changed:

- note backdrops keep layout semantics
- frame semantics drive ASCII border templates
- note cards and decision frames have compact Unicode rendering with geometric fallback

### 5. ER vertical cardinality spacing

`DELIVERER ||--o{ DELIVERY` in TD layouts used to draw marker pieces onto entity borders.

What changed:

- normalization reserves external vertical space for compact `er-relationship` markers
- compact marker rows stay outside entity borders

### 6. ER horizontal cardinality spacing

`CUSTOMER ||--o{ ORDER` in LR layouts used to push `○╟` into the target entity box.

What changed:

- normalization now supports horizontal endpoint clearance as a semantic connector policy
- compact LR markers stay outside entity borders in the same way TD markers already did
- ER relationship labels now get a diagram-side stable layout lane, so ASCII no longer has to recover from marker/label overlap after the fact

### 7. Connector semantic contract tightened

The first connector spacing fixes used `connector.family` checks inside ASCII normalization. That worked, but it mixed domain identity with layout policy.

What changed:

- connector spacing policy now lives in `ConnectorSemantic`
- `compactEndpointClearance` expresses whether compact endpoints need external space on `horizontal`, `vertical`, or `both` axes
- `compactEndpointClearanceMode` expresses whether clearance is `strict` or may `allow-partial` success when only one endpoint is adjacent to a semantic container
- `compactLaneReservation` expresses whether normalization may reserve extra external lanes before rasterization
- current usage:
  - ER relationships: endpoint clearance on both axes, with `allow-partial` so split label connectors still preserve outer marker spacing
  - activity flows: vertical endpoint clearance plus vertical lane reservation

### 8. ER inheritance triangle direction

The first compact-symbol pass replaced inheritance triangles with a fixed `△`, which lost the original rotation semantics and made some diagrams point the wrong way.

What changed:

- ER inheritance triangles are emitted as semantic symbols
- symbol semantics now carry optional `direction`
- ASCII maps that direction to `△`, `▽`, `◁`, or `▷`

### 9. Low-fidelity text should not depend on diagram classes

An early fix for ER inheritance hid `ISA` in ASCII by checking the mark class. That solved the immediate overlap, but it leaked diagram knowledge into the renderer.

What changed:

- low-fidelity text visibility is now expressed as `semantic.text.lowFidelityVisibility`
- `mark-walker` skips text only from that semantic hint
- renderer normalization no longer needs diagram-specific text exceptions
- current usage:
  - ER inheritance `ISA`: `omit` in ASCII so the compact triangle glyph stays legible
  - other labels remain renderer-visible unless artists opt out semantically

## Current Renderer Rules

### Text

- text is measured with CJK-aware width handling
- placement comes from `textAlign` and `textBaseline`
- normalized placement is chosen before rasterization
- low-fidelity text omission is driven by `semantic.text.lowFidelityVisibility`, not by renderer-side class checks

### Connectors

- compact rendering is used only when a connector normalizes to a stable axis-aligned span
- otherwise the renderer falls back to geometric rasterization
- endpoint meaning is preferred over sampled endpoint geometry
- endpoint spacing and lane reservation are driven by connector semantics, not renderer-side family heuristics
- partial endpoint clearance is allowed only when the connector semantic opts into it

### Symbols

- compact rendering is used for selected semantic symbols
- unsupported symbols fall back to sampled geometry
- ER inheritance triangles preserve direction via semantic metadata

### Frames

- notes and activity decisions have reviewed compact frame templates
- if a compact frame does not fit, ASCII falls back to geometry

## API Surface

Public-facing behavior remains small:

- renderer key: `ascii`
- `IRenderer#getTextContent?(): string`
- CLI `.txt` output uses the ASCII renderer

Relevant config:

```ts
core: {
  textRenderer: {
    cellWidth: number
    cellHeight: number
    trimRight: boolean
  }
}
```

Current defaults:

- `cellWidth: 8`
- `cellHeight: 16`
- `trimRight: true`

## Tests That Matter

Primary regression coverage lives in:

- `packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts`
- `packages/pintora-renderer/src/renderers/ascii/__tests__/rasterizer.spec.ts`
- `packages/pintora-renderer/src/renderers/ascii/__tests__/mark-walker.spec.ts`
- `packages/pintora-renderer/src/renderers/ascii/__tests__/normalize-ops.spec.ts`
- `packages/pintora-renderer/src/renderers/ascii/__tests__/golden.spec.ts`
- `packages/pintora-diagrams/src/er/__tests__/er-artist.spec.ts`

Useful debug workflow:

```bash
PINTORA_ASCII_TEST_DEBUG=1 pnpm exec jest path/to/spec --runInBand
```

## Known Limits

- the semantic subset is still selective, not universal across all marks
- many diagrams still rely on plain geometry more than ideal
- normalization handles the common structural cases, not full constraint solving
- ASCII is intentionally structure-first, not SVG-equivalent

## Design Conclusions

The stable lessons from this work are:

1. put meaning on marks early instead of inferring it from geometry later
2. do not try to fix semantic loss by sampling paths more densely
3. do normalization before rasterization, not as ad-hoc draw-time repair
4. keep SVG/Canvas geometry intact and let ASCII own its renderer-specific compromises
5. add regression cases from real DSL snippets, not only synthetic low-level fixtures

## When To Update This Archive

Update this file only when one of these changes:

- the semantic contract changes materially
- a new class of renderer regression changes the architecture
- a new compact connector, symbol, or frame family becomes part of the supported baseline

Do not expand this file with step-by-step implementation history again. Prefer small updates that keep it as a concise architectural archive.
