# Pintora Harness Review Adapter Design

Date: 2026-04-08

## Goal

Add a review/judge interface layer to `@pintora/harness` so harness outputs can be packaged into a stable review protocol instead of stopping at the string `human_review_or_visual_judge`.

This phase introduces:

- a standardized review payload
- a judge/review adapter interface
- a `review-case` command
- at least one built-in adapter for structured manual review handoff

The goal of this phase is protocol and packaging, not model intelligence.

## Non-Goals

This phase does not include:

- binding to a specific vision-language model provider
- provider-specific prompt engineering
- a browser review UI
- screenshot diffing
- golden baseline workflows
- automatic repair
- feeding review results back into orchestration state transitions

## Current Context

The harness now has:

- single-step commands
  - `render-svg`
  - `inspect-svg`
  - `capture-browser`
  - `summarize-case`
- orchestration commands
  - `run-case`
  - `run-suite`

The current decision chain ends with summary values such as:

- `done`
- `capture_browser`
- `human_review_or_visual_judge`
- `repair_and_rerun`

The unresolved gap is that there is no standard review protocol for the `human_review_or_visual_judge` branch.

## Design Principles

### Keep Review as a Consumer of Existing Artifacts

`review-case` must consume an existing artifacts directory.

It should not:

- re-render diagrams
- re-run capture
- re-run summary logic
- infer missing artifacts by launching earlier steps

This makes review a downstream consumer of the pipeline, not a second pipeline.

### Reuse `summary.json` as the Decision Boundary

The review layer should trust `summary.json` as its primary source of context.

It should not recompute:

- status
- next action
- top findings
- judge input selection

If `summary.json` is missing, review should fail.

### Separate Protocol from Implementation

The first phase of review should define:

- a stable payload
- a stable adapter interface
- a stable `review.json` result shape

The adapter itself may be simple.

This keeps the protocol reusable when future adapters are added for:

- external model APIs
- internal evaluation tools
- manual review systems

## Command Surface

Recommended command shape:

```bash
pintora-harness review-case \
  --artifacts artifacts/harness/<run-id>/<case-id> \
  --adapter manual-review-pack \
  --out artifacts/harness/<run-id>/<case-id>/review.json
```

### Required inputs

- `--artifacts <dir>`
- `--adapter <name>`
- `--out <file>`

### Optional inputs

- `--pack-dir <dir>`

`--pack-dir` is primarily for adapters that emit auxiliary artifacts such as human-facing review bundles.

## Adapter Set for This Phase

This phase should ship with two adapter names:

- `manual-review-pack`
- `noop`

### `manual-review-pack`

This is the default meaningful adapter in Phase 6.

It should:

- create a review pack directory
- emit the normalized review payload
- emit human-facing review instructions
- write a stable `review.json`

It should not attempt to produce a high-confidence automated visual judgment.

### `noop`

This adapter exists mainly to stabilize the interface and simplify testing.

It should:

- return a valid but intentionally non-committal review result
- avoid emitting extra review-pack artifacts unless explicitly requested

## Recommended Module Structure

Add the following modules under `packages/pintora-harness/src/review/`:

- `review-contracts.ts`
- `review-payload.ts`
- `review-adapter.ts`
- `review-case.ts`
- `adapters/manual-review-pack.ts`
- `adapters/noop.ts`

### Responsibilities

#### `review-contracts.ts`

Defines:

- normalized review payload type
- review result type
- review verdict enum
- adapter names

#### `review-payload.ts`

Responsible for:

- reading `summary.json`
- normalizing review inputs
- constructing a stable payload for adapters

It should not perform any judgment.

#### `review-adapter.ts`

Defines:

- the adapter interface
- adapter resolution by name

#### `review-case.ts`

Responsible for:

- reading review inputs from an artifacts directory
- resolving the requested adapter
- invoking the adapter
- writing `review.json`
- returning a stable stdout result

#### `adapters/manual-review-pack.ts`

Responsible for:

- creating a human-readable review pack
- writing payload artifacts used for manual or external-agent review
- returning a neutral but structured review result

#### `adapters/noop.ts`

Responsible for:

- returning a valid baseline review result without meaningful review work

## Review Payload

Adapters should receive one normalized payload object.

Recommended shape:

```json
{
  "run_id": "2026-04-08T12-30-15Z-er-relationship-spacing-01",
  "case_id": null,
  "diagram_type": null,
  "status": "suspicious",
  "next_action": "human_review_or_visual_judge",
  "top_findings": [
    "text is too close to the diagram edge for an ER case"
  ],
  "artifacts": {
    "svg": "render.svg",
    "browser_png": "browser.png",
    "dom_html": "dom.html",
    "metrics": "metrics.json",
    "findings": "findings.json",
    "summary": "summary.json"
  },
  "judge_inputs": [
    "render.svg",
    "browser.png",
    "findings.json",
    "dom.html"
  ]
}
```

## Payload Field Decisions

### `run_id`

Comes from `summary.json`.

### `case_id`

Comes from `summary.json` and may remain `null`.

### `diagram_type`

Comes from `summary.json` and may remain `null`.

### `status`

Must be copied from `summary.json`.

### `next_action`

Must be copied from `summary.json`.

This preserves the orchestration decision context that caused review to happen.

### `top_findings`

Must be copied from `summary.json`.

### `artifacts`

Should include:

- `svg`
- `browser_png`
- `dom_html`
- `metrics`
- `findings`
- `summary`

All paths should remain relative to the artifacts directory.

### `judge_inputs`

Should be copied from `summary.json.judge.inputs.artifacts`.

This avoids duplicating review-input selection logic in another layer.

## `review.json`

Adapters should emit a stable structured result.

Recommended shape:

```json
{
  "adapter": "manual-review-pack",
  "status": "completed",
  "verdict": "needs_human_review",
  "confidence": null,
  "summary": "browser evidence and structural findings require human judgment",
  "artifacts": {
    "pack_dir": "review-pack"
  }
}
```

## Review Result Field Decisions

### `adapter`

The adapter name used for the review.

### `status`

Recommended values:

- `completed`
- `failed`

This represents adapter execution status, not diagram quality status.

### `verdict`

Recommended first-phase verdict enum:

- `accept`
- `reject`
- `needs_human_review`
- `inconclusive`

The `manual-review-pack` adapter will typically return:

- `needs_human_review`
  or
- `inconclusive`

This is intentional.

The adapter is packaging work for review, not pretending to be a final judge.

### `confidence`

Nullable.

It may remain `null` in this phase.

### `summary`

A short adapter-provided explanation of the review result.

### `artifacts`

Adapter-specific output references.

For `manual-review-pack`, this should include a relative `pack_dir`.

## Adapter Interface

Recommended TypeScript interface:

```ts
export interface HarnessReviewAdapter {
  name: string
  run(input: {
    artifactsDir: string
    payload: HarnessReviewPayload
    outFile: string
    packDir?: string
  }): Promise<HarnessReviewResult>
}
```

## `review-case` Flow

The command should execute in this order:

1. validate the input directory and output path
2. read `summary.json`
3. normalize the review payload
4. resolve the requested adapter
5. run the adapter
6. write `review.json`
7. print structured stdout

If `summary.json` is missing, the command should fail immediately.

## `manual-review-pack` Behavior

This adapter should create a deterministic review pack for humans or external agents.

Recommended pack contents:

- `payload.json`
- `README.md`

Optional later additions such as copied artifacts or thumbnails are out of scope for this phase.

### `payload.json`

Contains the normalized review payload exactly as passed to the adapter.

### `README.md`

Should explain:

- which artifacts to inspect
- what the current summary status is
- what the top findings are
- that the next task is a review judgment rather than another pipeline step

It may include a short checklist, but it should stay lightweight.

## `noop` Behavior

The `noop` adapter should:

- return a valid review result
- set verdict to `inconclusive`
- avoid writing extra review-pack files unless a pack dir is explicitly requested

This keeps the interface testable without forcing every test through human-oriented pack generation.

## Output and Exit Codes

### Stdout

Recommended stdout shape:

```json
{
  "adapter": "manual-review-pack",
  "status": "completed",
  "verdict": "needs_human_review",
  "review": "review.json"
}
```

### Exit codes

Recommended exit code policy:

- `0`
  successful review command execution, regardless of verdict
- `1`
  command failure, missing summary, invalid adapter, or adapter runtime failure

Verdict should not be encoded into process exit codes in this phase.

## Error Handling

The command should fail with exit code `1` when:

- the artifacts directory does not exist
- `summary.json` is missing
- `summary.json` is invalid
- the adapter name is unknown
- the adapter throws or returns invalid output

The command should not silently downgrade these cases into `inconclusive`.

## Testing Strategy

### Payload builder unit tests

Verify that:

- `summary.json` is required
- the normalized payload copies status, next action, top findings, and judge inputs correctly
- relative artifact paths are preserved

### Adapter resolution and `review-case` unit tests

Verify that:

- the requested adapter is resolved by name
- `review.json` is written
- stdout structure is stable
- missing `summary.json` fails the command

### `manual-review-pack` integration tests

Using a minimal real artifacts directory, verify that:

- `review-pack/` is created
- `payload.json` exists
- `README.md` exists
- `review.json` exists
- the returned verdict is stable and neutral

## Risks and Tradeoffs

### Risk: provider-specific fields leak into the base protocol

Mitigation:

- keep provider-specific prompt or API details out of `review-contracts.ts`
- let adapters own their own internal details

### Risk: review layer recomputes summary behavior

Mitigation:

- require `summary.json`
- derive payload from summary instead of recomputing findings logic

### Risk: manual-review-pack grows into a pseudo-judge

Mitigation:

- keep its verdict intentionally conservative
- treat it as packaging, not interpretation

## Acceptance Criteria

This phase is complete when:

- `@pintora/harness` exposes a review adapter interface
- `pintora-harness review-case` exists
- `review-case` requires `summary.json`
- a normalized review payload is produced from an artifacts directory
- `manual-review-pack` emits a review pack and `review.json`
- `noop` provides a stable baseline adapter for tests
- no provider-specific model integration is required for completion

