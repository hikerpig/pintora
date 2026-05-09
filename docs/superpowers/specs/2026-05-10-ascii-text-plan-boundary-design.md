# ASCII Text Plan Boundary Design

Date: 2026-05-10

## Goal

Refactor Pintora's sequence ASCII renderer boundary so diagram-specific logic lives in
`pintora-diagrams`, while `pintora-renderer` only interprets generic text drawing
instructions.

The current sequence ASCII implementation already avoids recovering sequence structure
from generic geometry. It uses `rendererData.ascii.sequence` and renders through
`packages/pintora-renderer/src/renderers/ascii/sequence/*`.

That is a good intermediate state, but it still leaves sequence-specific text layout
inside the renderer package. The next architecture step is to move sequence planning
back into `pintora-diagrams` and introduce a renderer-neutral text drawing contract.

## Decision

Use a generic `TextDiagramPlan` as the ASCII renderer input.

The sequence diagram owns the transformation from sequence semantics to text drawing
operations:

```text
pintora-diagrams/sequence
  parser/db/layout
  -> SequenceLayoutResult
  -> SequenceAsciiIR
  -> SequenceTextPlan
  -> TextDiagramPlan

pintora-renderer
  AsciiRenderer
  -> renderTextDiagramPlan(plan)
  -> <pre> text
```

`AsciiRenderer` must not know about actors, notes, messages, activations, blocks, or
other sequence concepts. It only draws positioned text primitives onto a text canvas.

## Contract

`TextDiagramPlan` is an already-laid-out drawing plan. It is not a layout engine and
does not perform routing, collision repair, or diagram-specific interpretation.

Initial shape:

```ts
type TextDiagramPlan = {
  width: number
  height: number
  ops: TextOp[]
}

type Point = { x: number; y: number }

type TextOp =
  | TextOpText
  | TextOpLine
  | TextOpRect
  | TextOpFill

type TextOpText = {
  type: 'text'
  x: number
  y: number
  text: string
  align?: 'left' | 'center' | 'right'
}

type TextOpLine = {
  type: 'line'
  from: Point
  to: Point
  stroke?: 'solid' | 'dashed'
  startHead?: 'none' | 'filled' | 'open'
  endHead?: 'none' | 'filled' | 'open'
}

type TextOpRect = {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  stroke?: 'solid' | 'dashed'
}

type TextOpFill = {
  type: 'fill'
  x: number
  y: number
  width: number
  height: number
  char: string
}
```

In v1, `TextOpLine` supports only axis-aligned lines. `from.x === to.x` draws a
vertical line, and `from.y === to.y` draws a horizontal line. Non-axis-aligned lines
are outside the first contract and should not be emitted by diagrams.

The plan should be stored under:

```ts
graphicsIR.rendererData = {
  ascii: {
    plan: textDiagramPlan,
  },
}
```

During migration, `rendererData.ascii.sequence` can remain as a temporary compatibility
path if needed, but the target state is that `AsciiRenderer` reads only
`rendererData.ascii.plan`.

## Ownership

### `pintora-diagrams`

`pintora-diagrams` owns diagram-specific ASCII degradation and layout.

For sequence diagrams, this includes:

- actor column allocation
- event row allocation
- message label placement
- self-message templates
- note lane placement
- divider placement
- block and section occupancy
- activation bar placement
- conversion from sequence-specific plans into generic text ops

The existing logic in `packages/pintora-renderer/src/renderers/ascii/sequence/plan.ts`
belongs on this side of the boundary.

### `pintora-renderer`

`pintora-renderer` owns generic text rasterization.

This includes:

- text canvas creation
- writing text at coordinates
- drawing horizontal and vertical lines
- drawing rectangles
- drawing filled regions
- applying arrowhead glyphs for generic line ops
- converting the canvas to a string
- placing the string into the renderer `<pre>` element

The renderer must not import sequence-specific types or inspect sequence-specific
properties.

### `pintora-core`

The shared type location is `pintora-core`, because both `pintora-diagrams` and
`pintora-renderer` need to agree on the `TextDiagramPlan` shape without introducing a
dependency from diagrams to renderer.

## Non-Goals

Do not introduce sequence concepts into `TextDiagramPlan`.

These should stay out of the generic contract:

- `actor`
- `message`
- `note`
- `activation`
- `loop`
- `opt`
- `alt`
- `par`
- sequence-specific lanes or event indexes

Do not turn ASCII rendering into a low-fidelity SVG renderer.

These are intentionally out of scope for the first contract:

- path rendering
- polyline rendering beyond simple axis-aligned line ops
- circle or ellipse rendering
- automatic layout
- automatic collision avoidance
- diagram-specific semantic recovery

## Migration Strategy

1. Add the shared `TextDiagramPlan` types.
2. Add a generic text-plan renderer in `pintora-renderer`.
3. Move sequence text planning code from `pintora-renderer` to
   `pintora-diagrams/src/sequence/ascii/`.
4. Add a sequence adapter that converts `SequenceTextPlan` into `TextDiagramPlan`.
5. Make sequence artist emit `rendererData.ascii.plan`.
6. Update `AsciiRenderer` to prefer `rendererData.ascii.plan`.
7. Remove the old renderer-side sequence dispatch once tests cover the new path.

This keeps behavior migration incremental while making the target boundary explicit.

## Testing Strategy

Keep the current end-to-end ASCII rendering cases, but shift sequence-specific unit
tests into `pintora-diagrams`.

Suggested split:

- `pintora-diagrams`: tests for `SequenceAsciiIR -> SequenceTextPlan`
- `pintora-diagrams`: tests for `SequenceTextPlan -> TextDiagramPlan`
- `pintora-renderer`: tests for generic `TextDiagramPlan -> string`
- existing end-to-end DSL cases stay as regression coverage

The renderer tests should assert generic drawing behavior only. They should not contain
sequence DSL fixtures or sequence-specific expectations after the migration is complete.

## Acceptance Criteria

- `AsciiRenderer` does not import from `renderers/ascii/sequence/*`.
- `AsciiRenderer` does not inspect `rendererData.ascii.sequence`.
- sequence ASCII output is produced through `rendererData.ascii.plan`.
- sequence-specific ASCII planning code lives under `pintora-diagrams/src/sequence`.
- generic ASCII renderer tests cover text, line, rectangle, fill, dashed strokes, and
  arrowheads without sequence fixtures.
- existing sequence ASCII end-to-end snapshots or string assertions still pass.

## Risks

### Risk: `TextDiagramPlan` Becomes Too Much Like SVG

If the contract grows paths, shapes, markers, and styling too early, the renderer will
repeat the old geometry-based design problem.

Mitigation: keep v1 limited to text, axis-aligned lines, rectangles, and fills.

### Risk: Each Diagram Reimplements Low-Level Drawing

If diagrams emit final strings directly, every diagram will duplicate canvas and glyph
logic.

Mitigation: diagrams emit generic ops, not strings. Renderer stays the single owner of
low-level text rasterization.

### Risk: Sequence Logic Remains Split

If `AsciiRenderer` keeps a sequence fallback forever, the boundary remains ambiguous.

Mitigation: allow a temporary compatibility path only during migration, then remove it
once the `TextDiagramPlan` path has equivalent coverage.
