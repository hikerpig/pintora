# ASCII Harness Metrics Archive

## Purpose

This document records the design intent behind the ASCII harness metrics added for Pintora's text-rendered diagrams.

The harness is meant to verify ASCII output without opening a browser. It produces machine-readable evidence from two sources:

- `render.txt`: the final text emitted by the ASCII renderer.
- `plan.json`: the `TextDiagramPlan` used to produce that text.

The goal is not to judge aesthetics directly. The goal is to catch structural layout failures that usually make ASCII diagrams visually unreadable: clipped output, malformed boxes, text drawn over planned lines, and operations outside the declared viewport.

## Pipeline

```text
pintora-harness render-ascii
  -> render.txt
  -> plan.json

pintora-harness inspect-ascii
  -> ascii-metrics.json
  -> ascii-findings.json

pintora-harness render-ascii-preview
  -> ascii-preview.svg
```

`render-ascii` executes Pintora through `parseAndDraw`, then renders with the `ascii` renderer. This keeps the harness close to the same `GraphicsIR -> TextDiagramPlan -> text` path used by normal ASCII rendering.

`inspect-ascii` reads the rendered text and, when present, the plan. It emits a metric snapshot plus rule findings.

`render-ascii-preview` wraps the text in a deterministic SVG preview. This is intended for human review and artifact browsing, not as the primary correctness oracle.

## Metric Snapshot

`ascii-metrics.json` has this shape:

```ts
type AsciiMetricSnapshot = {
  lineCount: number
  maxDisplayWidth: number
  trailingWhitespaceLineCount: number
  boxCornerCounts: {
    topLeft: number
    topRight: number
    bottomLeft: number
    bottomRight: number
  }
  plan: null | {
    width: number
    height: number
    opCount: number
    textOpCount: number
    rectOpCount: number
    lineOpCount: number
    adjacentLineJoinCount: number
    opOutOfBoundsCount: number
    switchHeadIntrusionCount: number
    textLineConflictCount: number
  }
}
```

### Text Metrics

`lineCount` counts rendered text rows. Empty output is treated as failure by `inspect-ascii`.

`maxDisplayWidth` is the maximum display width across rows. It uses a grid-oriented width calculation:

- ASCII and box drawing glyphs count as 1 column.
- CJK and fullwidth ranges count as 2 columns.

This metric is used to catch runaway layouts such as a wide ER diagram that places all entities in a single row.

`trailingWhitespaceLineCount` tracks rows that end with whitespace. The current renderer trims trailing whitespace, so this is mostly a regression signal and not yet mapped to a finding.

`boxCornerCounts` counts `┌`, `┐`, `└`, and `┘`. Equal corner counts are a cheap structural signal that planned boxes survived rasterization.

### Plan Metrics

The `plan` block is `null` when no `plan.json` is provided. Without the plan, the harness can still inspect text shape, but it cannot detect semantic conflicts between planned operations.

`width` and `height` mirror the declared `TextDiagramPlan` viewport.

`opCount`, `textOpCount`, `rectOpCount`, and `lineOpCount` describe the complexity of the plan. They are useful when comparing two versions of a case: a large drop or spike often indicates a pipeline regression.

`adjacentLineJoinCount` counts rendered line fragments that look like adjacent
vertical and horizontal pieces instead of a shared corner or junction cell. For
example, `│──` and `──│` usually mean the plan used neighboring cells for a
turn, so the renderer could not synthesize `┌`, `┐`, `└`, or `┘`.

`opOutOfBoundsCount` counts plan operations that cannot fit inside the declared viewport:

- text starts before column 0, ends after `plan.width`, or sits outside `plan.height`
- line endpoints are outside the viewport
- rect or fill ops extend beyond the viewport

`switchHeadIntrusionCount` counts decision-style labels such as `< renderer type >`
whose head shape is intruded by a vertical connector line immediately below the
label row. It was introduced from activity `switch` and `if` regressions where a
line visually ran through the decision head.

`textLineConflictCount` counts grid cells occupied by both a text op and a line op. This is the main signal that exposed the initial ER ASCII problem: cardinality markers such as `||` and `o{` were placed as text on top of line cells, producing visual output like:

```text
─||────────o{─
```

## Findings

`ascii-findings.json` is derived from metrics. Current rules:

| Finding | Severity | Trigger |
| --- | --- | --- |
| `ascii-box-corner-mismatch` | `error` | with a plan, any rendered box corner count is less than `rectOpCount`; without a plan, the four box corner counts are not equal |
| `ascii-op-out-of-bounds` | `error` | `opOutOfBoundsCount > 0` |
| `ascii-text-line-conflict` | `warning` | `textLineConflictCount > 0` |
| `ascii-switch-head-intrusion` | `warning` | `switchHeadIntrusionCount > 0` |
| `ascii-adjacent-line-join` | `warning` | `adjacentLineJoinCount > 0` |

`inspect-ascii` maps findings to status:

| Status | Rule |
| --- | --- |
| `fail` | empty output or any `error` finding |
| `suspicious` | at least one warning and no errors |
| `ok` | no findings |

## Design Principles

Metrics should be evidence, not taste.

The harness should avoid encoding a full layout engine. It should expose small, reproducible signals that explain why a rendered diagram may be unreadable.

Metrics should be stable in CI. For this reason, text and plan checks are preferred over PNG pixel comparisons. `ascii-preview.svg` is a review artifact, not the source of truth.

Rules should be diagram-agnostic where possible. The current checks operate on `TextDiagramPlan` and rendered text, not on ER-specific syntax. ER-specific expectations should live in renderer or diagram tests unless a generic metric can express the problem.

Warnings are acceptable for early layout work. A warning lets the harness preserve an artifact and flag the case for review while not treating every low-fidelity issue as a hard failure.

Line aesthetics should be tested as structural evidence, not as subjective taste.
The harness flags adjacent line joins because they reveal a concrete plan defect:
two line segments that should meet at one pivot cell were emitted into neighboring
cells. The renderer can choose good glyphs only when the plan preserves the
topology.

## Known Boundaries

`textLineConflictCount` is intentionally conservative. Some future text-on-line cases may be valid if the renderer introduces semantic line labels. If that happens, the plan should represent label exclusion zones or intentional overlays instead of weakening the metric globally.

The box corner check only proves planned rect corners are present. When a
`plan.json` is available, extra `┌┐└┘` glyphs from connector turns are allowed.
Without a plan, the harness falls back to the older balanced-corner heuristic.
Neither mode proves every box is rectangular or that borders are continuous.

The width model is grid-oriented, not font-measured. It is correct for terminal-style layout decisions, but it is not a browser typography measurement.

The current metrics do not detect all visual overlaps. They focus on operation
bounds, text-line conflicts, decision-head intrusion, and malformed adjacent line
joins. Text-text overlaps, line-rect routing conflicts, and
relationship-to-entity semantic attachment are future extensions.

## Example Interpretation

For the original complex ER ASCII output, metrics reported:

```json
{
  "maxDisplayWidth": 185,
  "plan": {
    "opOutOfBoundsCount": 0,
    "textLineConflictCount": 16
  }
}
```

The output was not clipped, but it was too wide and had marker text drawn over relationship lines. The right fix was not a renderer patch. The ER ASCII plan needed a more compact layout and a relationship representation that did not overlay marker text onto line cells.

After the ER fix, the same case reported:

```json
{
  "maxDisplayWidth": 85,
  "plan": {
    "opOutOfBoundsCount": 0,
    "textLineConflictCount": 0
  }
}
```

This does not prove the ER ASCII layout is final. It proves the concrete structural failures that made the previous output unreadable are gone.

## Commands

```bash
bun packages/pintora-harness/bin/pintora-harness render-ascii \
  --case er.relationship-spacing-01 \
  --out-dir artifacts/harness/ascii-dev

bun packages/pintora-harness/bin/pintora-harness inspect-ascii \
  --in artifacts/harness/ascii-dev/render.txt \
  --plan artifacts/harness/ascii-dev/plan.json \
  --out-dir artifacts/harness/ascii-dev

bun packages/pintora-harness/bin/pintora-harness render-ascii-preview \
  --in artifacts/harness/ascii-dev/render.txt \
  --out artifacts/harness/ascii-dev/ascii-preview.svg
```

Use the JSON artifacts for automated decisions. Use `render.txt` and `ascii-preview.svg` for human review.
