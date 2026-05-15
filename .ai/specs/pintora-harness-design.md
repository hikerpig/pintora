# Pintora Harness Design

## Status

This document is the consolidated spec for the Pintora harness. It supersedes the
seven phased design docs (engineering, capture-browser, summary, extraction,
orchestration, review-adapter, review-ingestion) and is normalized against the
current implementation in `packages/pintora-harness`.

The harness is an internal-only package. Its goal is a low-noise, reusable, and
handoff-friendly validation loop for AI agents working on diagram layout
quality. It does not replace the existing Jest / Cypress / snapshot stack.

## Goals and Non-goals

### Goals

1. Let agents validate whether a layout has obvious issues by running
   svg-based structural checks after a code change.
2. Add browser screenshots automatically for suspicious cases as stronger
   evidence.
3. Produce structured artifacts that external agents can consume for
   replanning, review, and repair suggestions.
4. Focus on `er` and `sequence` first.
5. Keep the judge external in this phase, while reserving interface hooks for
   later visual-model integration.

### Non-goals

- automatic code editing or end-to-end commit-on-fix
- covering every diagram type from day one
- screenshot diffing or golden baselines
- vendor-specific judge integration
- preview server lifecycle management
- distributed or parallel execution beyond `--max-concurrency`

## Architecture

The harness is composed of four logical layers. Each layer has a single
responsibility and writes stable artifact filenames so later layers and external
agents can resume from disk.

| Layer            | Responsibility                                                  |
| ---------------- | --------------------------------------------------------------- |
| Render adapters  | render an input into normalized outputs (currently `svg` only). |
| Inspectors       | compute objective structural checks; no subjective judgment.    |
| Capture          | take browser evidence when structural signals are suspicious.   |
| Report assembly  | combine artifacts into machine-readable summaries and reviews.  |

`summary.json` is the orchestration decision boundary: capture-browser
escalation, review packaging, and apply-review ingestion all branch on it
rather than re-deriving rule outputs.

## Package Layout

The harness lives in its own internal workspace package. `@pintora/cli` contains
no harness logic.

- Package: `packages/pintora-harness`
- Bin: `pintora-harness` (resolves to `lib/cli.js`)
- Allowed runtime deps: `@pintora/cli`, `@pintora/core`, `@pintora/diagrams`,
  `@pintora/renderer`, `@pintora/standalone`, `playwright`, `jsdom`, `consola`,
  `yargs`, `canvas`.
- Forbidden: harness must not be imported back into `@pintora/cli`.

Case assets live at the repo root under `harness/cases/`. Code ownership for
reading them belongs to `@pintora/harness`.

### Source modules

- `cli.ts` — argument parsing, command routing, exit-code mapping.
- `index.ts` — re-exports the public runtime API.
- `contracts/{harness,browser,summary}.ts` — types and constants.
- `cases/case-registry.ts`, `cases/read-input.ts` — registry loading and input
  resolution.
- `rendering/render-svg.ts`, `rendering/render-adapter.ts` — svg rendering
  through `@pintora/cli`'s `renderToSvg`.
- `inspection/inspect-svg.ts`, `inspection/svg-parse.ts`,
  `inspection/svg-metrics.ts`, `inspection/findings.ts`,
  `inspection/rules/{er,sequence}-rules.ts` — structural inspection.
- `browser/{capture-browser,browser-preview-url,browser-capture}.ts` — Playwright
  capture against the demo preview page.
- `summary/{summarize-case,summary-rules,artifact-reader}.ts` — summary
  assembly from artifacts on disk.
- `review/{review-case,review-adapter,review-payload,review-contracts}.ts`,
  `review/adapters/{manual-review-pack,noop}.ts` — review packaging.
- `review/{apply-review,apply-review-contracts}.ts` — review ingestion.
- `orchestration/{run-case,run-suite,case-runner,suite-selector,run-contracts}.ts`
  — case and suite pipelines.
- `exit-codes.ts` — `statusToExitCode`.

## CLI Commands

The CLI is `pintora-harness`. All commands print one JSON line on stdout.
Errors are logged to stderr via consola and set `process.exitCode = 1`.

### `render-svg`

Render a case or input file to svg.

```
pintora-harness render-svg --case <id> --out <file>
pintora-harness render-svg --input <pintora-file> --out <file>
```

- Inputs: exactly one of `--case` or `--input`; required `--out`.
- Output: `render.svg`.
- stdout: `{"status":"ok","diagramType":"er","artifact":"render.svg"}`.
- Diagram type comes from the registry entry when `--case` is provided,
  otherwise it is inferred from the source (`erDiagram` / `sequenceDiagram`
  / `unknown`).
- Implementation calls `renderToSvg` from `@pintora/cli` with
  `renderInSubprocess: false`. There is no `render-png` command in the
  harness.

### `inspect-svg`

Inspect a rendered svg and emit metrics + findings.

```
pintora-harness inspect-svg --in <svg> [--case <id>] --out-dir <dir>
```

- Inputs: required `--in`, required `--out-dir`, optional `--case`.
- Outputs: `metrics.json`, `findings.json`.
- stdout: `{"status":"ok|suspicious|fail","findingCount":<n>,"artifacts":["metrics.json","findings.json"]}`.
- Status rules (also reused by `summarize-case`):
  - `fail` when `viewBox` is missing or `rootChildCount === 0`.
  - `suspicious` when findings are non-empty.
  - `ok` otherwise.
- Diagram-specific rules run only when `--case` is provided and the registry
  entry's `diagram_type` matches `er` or `sequence`.

### `capture-browser`

Capture browser evidence against the running demo preview page.

```
pintora-harness capture-browser \
  --case <id> | --input <file> \
  --out-dir <dir> \
  [--base-url http://localhost:3001/demo/preview/] \
  [--viewport WIDTHxHEIGHT]
```

- Outputs: `browser.png`, `dom.html`.
- stdout: `{"status":"ok","artifacts":["browser.png","dom.html"],"renderer":"svg-preview","previewUrl":"..."}`.
- Exit codes: `0` on success, `1` on failure. This command does not produce
  `10` / `20`; suspicion is the responsibility of `inspect-svg` and
  `summarize-case`.
- Stability: forced `renderer=svg`, `e2e=true`, default base URL
  `http://localhost:3001/demo/preview/`, default viewport `1440x960`,
  device scale factor `1`. The preview server must already be running.
- Wait sequence before screenshot: wait for `.preview` selector, await
  `document.fonts.ready`, wait for `.preview svg`, then poll
  `.preview` bounding box up to 5 times (50 ms apart) until two consecutive
  reads agree before capturing the container.

### `summarize-case`

Roll an artifacts directory into `summary.json`.

```
pintora-harness summarize-case --artifacts <dir> --out <file>
```

- Inputs: artifacts directory only — never recomputes earlier steps.
- Required artifacts: `metrics.json`, `findings.json`. Missing them fails the
  command (exit `1`).
- Optional artifacts (listed in summary when present): `render.svg`,
  `render.png`, `browser.png`, `dom.html`.
- stdout: `{"status":"ok|suspicious|fail","nextAction":"...","summary":"summary.json","exitCode":<n>}`.
- Exit codes: `0` ok, `10` suspicious, `20` fail, `1` invalid input.
- `run_id` is derived from the artifacts directory basename. `case_id` and
  `diagram_type` are currently always `null`.

### `review-case`

Package an existing artifact directory for downstream review. Downstream-only
— it does not re-render, re-capture, or re-summarize.

```
pintora-harness review-case \
  --artifacts <dir> \
  --adapter manual-review-pack | noop \
  --out <file> \
  [--pack-dir <dir>]
```

- Requires `summary.json` to exist. If missing or invalid, the command fails.
- `--pack-dir` is optional. If absent, the `manual-review-pack` adapter writes
  to `<artifacts>/review-pack/`. The `noop` adapter only writes a pack when
  `--pack-dir` is provided.
- stdout: `{"adapter":"...","status":"completed|failed","verdict":"...","review":"<basename>"}`.
- Exit codes: `0` when `status === "completed"`, otherwise `1`.

#### Adapters

- `manual-review-pack` — creates `payload.json` and `README.md` inside the
  pack directory. Verdict is fixed at `needs_human_review`. The adapter is
  packaging, not interpretation.
- `noop` — returns `verdict: inconclusive` and writes nothing unless
  `--pack-dir` is set, in which case it only writes `payload.json`.

Both adapters validate that the resolved pack directory is inside the
artifacts directory.

### `apply-review`

Ingest `summary.json` + `review.json` into a stable orchestration decision.

```
pintora-harness apply-review \
  --artifacts <dir> \
  --review <file> \
  --out <file>
```

- Reads `summary.json` from the artifacts directory and the supplied
  `review.json`. Neither source is modified.
- Writes `review-decision.json` with `next_step.type` ∈ `accept | repair |
  rerun | escalate`.
- Validates that the review's `status === "completed"`. If `review.run_id` is
  present it must equal `summary.run_id`; mismatch fails the command rather
  than silently downgrading.
- stdout: `{"status":"completed|failed","review_status":"consumed","decision":"<basename>"}`.
- Exit codes: `0` on completed, `1` on failure.

### `run-case`

Orchestrate `render-svg` → `inspect-svg` → `summarize-case`, with optional
browser escalation.

```
pintora-harness run-case \
  --case <id> | --input <file> \
  --artifacts-dir <dir> \
  [--base-url <url>] [--viewport WIDTHxHEIGHT] \
  [--no-capture-browser]
```

- Pipeline:
  1. resolve input source and target artifact directory
  2. render-svg → `render.svg`
  3. inspect-svg → `metrics.json`, `findings.json`
  4. summarize-case → `summary.json`
  5. if `summary.next_action === "capture_browser"` and capture is enabled:
     run capture-browser, then re-run summarize-case
  6. return the final summary
- `--no-capture-browser` disables step 5 even when summary asks for it.
- stdout: `{"status":"...","nextAction":"...","artifactsDir":"...","summary":"summary.json","captureBrowserTriggered":<bool>}`.
- Exit codes: same status mapping as `summarize-case`.
- `run-case` does not consume `review.json`. After review completes,
  `apply-review` is the explicit handoff step.

### `run-suite`

Run a predefined batch and aggregate per-case results.

```
pintora-harness run-suite \
  --suite smoke | all \
  --artifacts-dir <dir> \
  [--base-url <url>] [--viewport WIDTHxHEIGHT] \
  [--no-capture-browser] [--max-concurrency <n>]
```

- Selectors:
  - `smoke` → fixed list:
    `er.relationship-spacing-01`, `sequence.lifeline-label-separation-01`.
  - `all` → every case id from `harness/cases/registry.json`, sorted.
- Behavior: serial execution by default; one case failure does not abort the
  suite. The `--max-concurrency` flag is accepted but the current
  implementation runs cases sequentially.
- For each case, `run-suite` reads `<case>/review-decision.json` if present
  and folds `next_step.type` into the suite counters.
- Writes `suite.json` at the suite root.
- Exit codes: `20` if any case failed, `10` if any suspicious, otherwise `0`.

## Pipeline Flow

```
run-case
  ├── render-svg
  ├── inspect-svg
  ├── summarize-case → summary.json
  └── capture-browser (when summary.next_action === capture_browser)
       └── summarize-case → summary.json (rewritten)

review-case (manual handoff)
  └── review.json

apply-review
  ├── reads summary.json
  ├── reads review.json
  └── writes review-decision.json

run-suite
  └── per case: run-case + (optional) read review-decision.json → suite.json
```

## Artifact Contracts

Per-case artifact directory layout:

- `render.svg` — primary render artifact.
- `render.png` — optional; not produced by current commands but preserved as
  an optional slot if external tooling drops one in.
- `browser.png`, `dom.html` — produced by `capture-browser`.
- `metrics.json`, `findings.json` — produced by `inspect-svg` (required).
- `summary.json` — produced by `summarize-case` (required by review).
- `review.json` — produced by `review-case` (consumer of `summary.json`).
- `review-decision.json` — produced by `apply-review`.
- `review-pack/` — produced by `manual-review-pack` (or by `noop` when
  `--pack-dir` is supplied).

Suite root layout:

- `suite.json` at the suite artifacts root.
- One subdirectory per case, each following the per-case layout above.

### `summary.json`

```json
{
  "run_id": "<artifacts dir basename>",
  "case_id": null,
  "diagram_type": null,
  "status": "ok | suspicious | fail",
  "pipeline": ["render-svg", "inspect-svg", "capture-browser"],
  "artifacts": {
    "svg": "render.svg | null",
    "png": "render.png | null",
    "browser_png": "browser.png | null",
    "dom_html": "dom.html | null",
    "metrics": "metrics.json",
    "findings": "findings.json"
  },
  "scores": {
    "legibility": 0 | 2 | 3,
    "structural_clarity": 0 | 2 | 3,
    "spatial_balance": 3 | null,
    "visual_taste": null
  },
  "top_findings": ["<message>", "..."],
  "next_action": "done | capture_browser | human_review_or_visual_judge | repair_and_rerun",
  "judge": {
    "required": <bool>,
    "inputs": {
      "artifacts": ["render.svg", "browser.png", "findings.json", "dom.html"]
    }
  }
}
```

Field rules (current implementation):

- `pipeline` is inferred from artifacts: includes `render-svg` if
  `render.svg` exists; `inspect-svg` if both `metrics.json` and
  `findings.json` exist; `capture-browser` if `browser.png` exists.
- `top_findings` lists up to 3 finding messages.
- `judge.inputs.artifacts` filters out missing optionals from the preferred
  ordering `[svg, browser_png, findings, dom_html]`.
- `judge.required` is `true` only when status is `suspicious` and
  `browser.png` exists.

`next_action` rules:

| status      | browser.png present? | next_action                       |
| ----------- | -------------------- | --------------------------------- |
| ok          | n/a                  | `done`                            |
| suspicious  | no                   | `capture_browser`                 |
| suspicious  | yes                  | `human_review_or_visual_judge`    |
| fail        | n/a                  | `repair_and_rerun`                |

Score buckets (intentionally coarse):

- `fail` → `legibility=0`, `structural_clarity=0`, `spatial_balance=null`,
  `visual_taste=null`.
- `suspicious` (findings present) → `legibility=2`, `structural_clarity=2`,
  `spatial_balance=null`, `visual_taste=null`.
- `ok` → `legibility=3`, `structural_clarity=3`, `spatial_balance=3`,
  `visual_taste=null`.

`visual_taste` is always `null` in this phase.

### `review.json`

```json
{
  "adapter": "manual-review-pack | noop",
  "status": "completed | failed",
  "verdict": "accept | reject | needs_human_review | inconclusive",
  "confidence": null,
  "summary": "<short adapter-provided explanation>",
  "recommended_action": {
    "type": "accept | reject | repair | rerun | escalate",
    "reason": "...",
    "target": "diagram_source | render_pipeline | browser_capture",
    "requires_human_confirmation": <bool>
  },
  "run_id": "<optional run id for context match>",
  "artifacts": {
    "pack_dir": "review-pack | <relative dir>"
  }
}
```

`recommended_action` and `run_id` are optional. `requires_human_confirmation`
is reserved for future automation gating; ingestion currently does not branch
on it.

### `review-decision.json`

```json
{
  "status": "completed",
  "review_status": "consumed",
  "source": {
    "summary": "summary.json",
    "review": "review.json"
  },
  "next_step": {
    "type": "accept | repair | rerun | escalate",
    "reason": "...",
    "target": "diagram_source | render_pipeline | browser_capture"
  }
}
```

Decision priority: `recommended_action` (when present and valid) wins over
`verdict` fallback. The orchestration `next_step.type` enum is intentionally
narrower than the review-layer `recommended_action.type` (the review-only
value `reject` maps to orchestration `repair`).

| Source in `review.json`              | `next_step.type` |
| ------------------------------------ | ---------------- |
| `recommended_action.type: accept`    | `accept`         |
| `recommended_action.type: reject`    | `repair`         |
| `recommended_action.type: repair`    | `repair`         |
| `recommended_action.type: rerun`     | `rerun`          |
| `recommended_action.type: escalate`  | `escalate`       |
| (fallback) `verdict: accept`         | `accept`         |
| (fallback) `verdict: reject`         | `repair`         |
| (fallback) `verdict: needs_human_review` | `escalate`   |
| (fallback) `verdict: inconclusive`   | `escalate`       |

### `suite.json`

```json
{
  "suite": "smoke",
  "total": <n>,
  "ok": <n>,
  "suspicious": <n>,
  "fail": <n>,
  "captureBrowserTriggeredCount": <n>,
  "accepted": <n>,
  "needsRepair": <n>,
  "needsRerun": <n>,
  "escalated": <n>,
  "reviewPending": <n>,
  "cases": [
    {
      "caseId": "er.relationship-spacing-01",
      "status": "suspicious",
      "summary": "er.relationship-spacing-01/summary.json",
      "captureBrowserTriggered": true,
      "reviewDecision": "repair | accept | rerun | escalate | undefined"
    }
  ]
}
```

`reviewPending` counts cases whose status is not `ok` and which have no
`review-decision.json` yet. The suite layer is purely an aggregator; it does
not re-interpret per-case findings.

## Case Registry

`harness/cases/registry.json` lists each case with id, diagram type, title,
input file path, tags, checks, escalation policy, and a `golden` block. The
registry is the single source of truth for case-to-rule mapping; case ids are
dotted, e.g. `er.relationship-spacing-01`.

Registry loading walks parent directories from `cwd` until it finds
`harness/cases/registry.json`. Input files are resolved relative to that
workspace root.

Currently shipped cases:

- ER: `er.relationship-spacing-01`, `er.relationship-label-lane-01`,
  `er.crowding-hotspot-01`.
- Sequence: `sequence.lifeline-label-separation-01`,
  `sequence.message-label-collision-01`,
  `sequence.activation-stack-clarity-01`.

The `smoke` suite intentionally selects only two of these as a fast path.

## Inspection Rules

The current rule set is deliberately narrow. `buildSvgMetrics` extracts:

- `viewBox` (from attribute or width/height fallback)
- `rootChildCount`
- `textNodes` (`text` elements with `x`/`y`)
- `elementCounts` for `text`, `rect`, `line`, `path`, `polygon`
- `minTextToEdge` — the smallest distance from any text anchor point to any
  side of the viewBox

Rules implemented today:

- `er-rules.entity-border-clearance` — emits a warning when
  `minTextToEdge < 4`. Message: "text is too close to the diagram edge for an
  ER case".
- `sequence-rules.edge-overflow` — emits a warning when
  `minTextToEdge < 4`. Message: "label is pushed too close to the viewBox
  edge".

The richer rule set discussed in the original phased docs
(`relationship-label-lane-stability`, `shared-border-coordination`,
`symbol-direction-consistency`, `crowding-hotspot`,
`lifeline-label-separation`, `message-label-collision`,
`activation-stack-clarity`, `alt-loop-frame-legibility`) is not yet
implemented. The registry's `checks` field references those rule names but
they are documentation-only until the corresponding rule modules are added.

## Exit Codes

| Code | Meaning                                                   |
| ---- | --------------------------------------------------------- |
| 0    | success / `ok`                                            |
| 10   | success but result is `suspicious` (inspect/summarize/run)|
| 20   | success but result is `fail` (inspect/summarize/run)      |
| 1    | command or runtime failure                                |

`capture-browser`, `review-case`, and `apply-review` only ever return `0` or
`1`. `run-suite` follows the worst-case rule (any `fail` → `20`, otherwise
any `suspicious` → `10`, else `0`).

## Browser Capture Stability

Reproducible capture relies on:

- preview server already running on the configured base URL
- forced `renderer=svg`
- forced `e2e=true` to reuse the preview page's font-readiness path
- fixed viewport (default `1440x960`) and DPR (`1`)
- container-only screenshot (`.preview`)
- font readiness wait + double-read of the container bounding box before
  capture
- per-run output directory; do not share output dirs across runs

## Testing Strategy

Tests live alongside sources at `packages/pintora-harness/src/__tests__/` and
are run with Jest (`pnpm --filter @pintora/harness test`). The current suite
covers:

- per-step unit tests: render-svg, inspect-svg, capture-browser (driver
  mocked), summarize-case, summary rules, artifact-reader, browser preview
  URL, review payload, review adapter resolution, manual-review-pack,
  apply-review, suite-selector, case-registry.
- orchestration tests: run-case (mocked steps) and run-suite aggregation.
- end-to-end smokes: `harness-e2e.spec.ts`, `run-case.e2e.spec.ts`, and
  `apply-review.e2e.spec.ts`. These exercise the real pipeline against a
  real registry case but stay below the browser layer when a preview server
  is not available.

The existing Jest / Cypress / snapshot stack remains the source of truth for
product correctness; the harness is an orthogonal validation surface.

## Future Work

Items deliberately deferred from earlier phased designs:

- richer ER and sequence rule modules beyond `minTextToEdge`
- pluggable visual judge adapter (the schema reserves `judge.required` and
  `judge.inputs.artifacts` for this)
- automatic execution of safe `next_step` actions from `apply-review`
- richer suite selectors (tags, glob filters)
- true parallel `run-suite` execution under `--max-concurrency`
- `case_id` / `diagram_type` propagation into `summary.json`
- `render.png` and other render adapters
- public package publishing
