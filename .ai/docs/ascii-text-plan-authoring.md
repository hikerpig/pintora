# ASCII Text Plan Authoring

`TextDiagramPlan` is the grid-native ASCII drawing contract shared by
`pintora-core`, `pintora-diagrams`, and `pintora-renderer`.

Use it when a diagram can emit stable cell coordinates directly instead of
asking the ASCII renderer to recover structure from SVG geometry.

## Boundary

`TextDiagramPlan` is an already-laid-out drawing plan, not a layout engine.
Diagram packages own diagram-specific degradation and layout decisions. The
renderer only draws generic text, rect, fill, and axis-aligned line ops.

The shared type is defined in
`packages/pintora-core/src/types/graphics.ts:51`.

The generic renderer path is
`packages/pintora-renderer/src/renderers/ascii/text-plan-renderer.ts:80`.

## Diagrams-Side Helpers

When authoring plans inside `packages/pintora-diagrams`, prefer
`packages/pintora-diagrams/src/util/text-diagram.ts:1` over local helpers.

Current helpers:

| Helper                                 | Use                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `widthOf`                              | Measure CJK-aware text width in cells.                                         |
| `textOp`, `lineOp`, `rectOp`, `fillOp` | Build `TextDiagramOp` values consistently.                                     |
| `alignedTextLeft`                      | Convert an aligned text anchor to its real left cell.                          |
| `measureTextDiagramOps`                | Compute final plan width and height from emitted ops.                          |
| `roundPoint`, `midpoint`               | Normalize graph-layout points into integer cell points.                        |
| `manhattanize`                         | Convert a point list into orthogonal route segments.                           |
| `snapRouteEndpoints`                   | Move route endpoints just outside source and target boxes.                     |
| `drawRoute`                            | Convert an orthogonal route into line ops and attach heads only to route ends. |
| `translateTextDiagramOps`              | Compose local block coordinates into parent coordinates.                       |

Do not duplicate these per diagram. If a new diagram needs the same geometry or
measurement behavior, add or extend the shared helper and cover it with
`packages/pintora-diagrams/src/util/__tests__/text-diagram.spec.ts`.

## Drawing Rules

- Lines must be horizontal or vertical. Non-axis-aligned line ops are rejected
  by `packages/pintora-renderer/src/renderers/ascii/text-plan-renderer.ts:68`.
- Orthogonal turns and joins must share the same pivot cell. Adjacent glyphs
  like `│──` or `──│` are malformed because the renderer cannot infer whether
  the intended glyph is `┌`, `┐`, `└`, or `┘`.
- Shared pivot cells are merged from direction sets, not from the visible glyph
  alone. This preserves endpoint direction: a horizontal endpoint plus a
  downward vertical line becomes `┌` or `┐`, not `┬`.
- Text has higher visual priority than plain line drawing. A plan that places
  text on planned line cells is suspicious and should be represented with
  explicit spacing or label lanes instead of relying on overwrites.
- Rects are still the canonical representation for action-like boxes. Decision
  heads should use a visually distinct frame, such as the sloped `/...\\`,
  `< label >`, `\\.../` shape used by activity `if` and `switch`.

Malformed corner:

```text
│────────
```

Preferred plan geometry shares the corner cell and lets the renderer choose the
glyph:

```text
┌────────
```

## Route Guidelines

Use `manhattanize` and `snapRouteEndpoints` for graph-layout routes that come
from dagre or similar layout engines. Use `drawRoute` to emit the actual line
ops.

`drawRoute` intentionally places arrowheads only on the first and last drawable
segments. Intermediate segments should remain plain line ops so route bends do
not acquire accidental heads.

Keep relationship-specific labels and markers in diagram-owned layout structs.
Generic helpers know boxes and points; they should not learn ER, Component,
Sequence, or Activity concepts.

## Activity Block Conventions

Activity text plans build nested blocks with local coordinates. Use
`translateTextDiagramOps` when composing child blocks.

Activity-specific conventions built on the generic drawing rules:

- `if` and `switch` use the same decision head block so they do not look like
  ordinary actions.
- Decision branch connectors first leave the head vertically, then fan out on a
  shared horizontal bus.
- Branch starts and joins use shared pivot cells so top buses render as
  `┌──┴──┐` / `┌──┼──┐` and merge buses render as `└──┴──┘`.
- Terminal `switch` blocks do not draw a merge bus below the branch action
  boxes.

## Testing

Useful test split:

- `packages/pintora-diagrams`: test diagram semantics to diagram-specific text
  layout, and diagram layout to `TextDiagramPlan`.
- `packages/pintora-diagrams/src/util/__tests__/text-diagram.spec.ts`: test
  shared helper behavior.
- `packages/pintora-renderer`: test generic `TextDiagramPlan` rendering.
- End-to-end DSL tests stay as regression coverage for real diagrams.

For focused ASCII plan changes, run the affected diagram tests plus:

```bash
pnpm exec jest packages/pintora-diagrams/src/util/__tests__/text-diagram.spec.ts packages/pintora-renderer/src/renderers/ascii/__tests__/text-plan-renderer.spec.ts --runInBand
```
