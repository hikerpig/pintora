# Pintora Harness Summary Case Design

## Status

This document defines the Phase 3 design for adding `summarize-case` and `summary.json` to the Pintora harness. Phase 1 already provides structural render and inspect commands. Phase 2 adds browser evidence capture. Phase 3 turns those artifacts into a stable, machine-readable summary that external agents can consume for replanning, review, and repair loops.

This design keeps the command surface inside `@pintora/cli` for now, while isolating the summary logic so it can later move into a standalone harness package.

## Goal

Add a `harness summarize-case` command that:

- reads a single artifacts directory
- infers available pipeline steps from the artifacts present
- computes a stable harness `status`
- computes a rule-based `next_action`
- emits `summary.json`
- reserves judge input fields for later human review or visual-model integration

## Non-goals

This phase does not aim to:

- re-render diagrams
- re-run browser capture
- accept raw Pintora code or case ids as primary inputs
- invoke any model judge directly
- perform screenshot diffing
- infer missing artifacts by launching earlier pipeline steps

## Constraints Confirmed

The following constraints are locked in:

- `summarize-case` only accepts an artifacts directory as its source of truth
- `summary.json` must include a `next_action` field
- `next_action` is rule-driven for now
- the summary must reserve judge input fields for later human review or visual judge integration
- the command should stay in `@pintora/cli` for now

## Recommended Command Shape

### Command

```bash
pintora harness summarize-case \
  --artifacts artifacts/harness/<run-id> \
  --out artifacts/harness/<run-id>/summary.json
```

### Inputs

- `--artifacts <dir>`
- `--out <file>`

### Outputs

- `summary.json`

### Stdout

```json
{"status":"suspicious","nextAction":"human_review_or_visual_judge","summary":"summary.json"}
```

### Exit Codes

- `0`: summary assembled successfully and result is `ok`
- `10`: summary assembled successfully and result is `suspicious`
- `20`: summary assembled successfully and result is `fail`
- `1`: command failure, missing required inputs, or invalid artifact content

The command should reuse the same harness status semantics already established by `inspect-svg`.

## Placement

Phase 3 should continue to use the existing `@pintora/cli` harness command group, but summary-specific logic should be isolated into dedicated modules.

### Recommended files

- `packages/pintora-cli/src/harness/summarize-case.ts`
- `packages/pintora-cli/src/harness/summary-contracts.ts`
- `packages/pintora-cli/src/harness/summary-rules.ts`
- `packages/pintora-cli/src/harness/artifact-reader.ts`

### Responsibility split

#### `summarize-case.ts`

Command orchestration only:

- validate command arguments
- read artifact inputs through `artifact-reader`
- call summary rules
- write `summary.json`
- print structured stdout
- map status to exit code

#### `summary-contracts.ts`

Shared types and enums:

- summary schema
- score structure
- action enum
- judge payload structure

#### `summary-rules.ts`

Rule-based interpretation only:

- derive `status`
- derive `scores`
- derive `top_findings`
- derive `next_action`
- derive judge requirements

#### `artifact-reader.ts`

Filesystem input only:

- read standard artifact file names
- parse `metrics.json`
- parse `findings.json`
- record which optional artifacts exist
- return relative artifact paths

This file should not perform judgment.

## Source of Truth

The artifacts directory is the only source of truth for the command. The command should not accept a case id or diagram input and should not attempt to guess where artifacts live outside the given directory.

### Standard artifact names

The reader should look for these exact filenames:

- `render.svg`
- `render.png`
- `browser.png`
- `dom.html`
- `metrics.json`
- `findings.json`

### Required artifacts

These are required:

- `metrics.json`
- `findings.json`

If either file is missing, the command should fail with exit code `1`.

### Optional artifacts

These are optional:

- `render.svg`
- `render.png`
- `browser.png`
- `dom.html`

Optional artifacts should still be listed in the summary when present.

## Recommended `summary.json` Shape

```json
{
  "run_id": "2026-04-08T12-30-15Z-er-relationship-spacing-01",
  "case_id": null,
  "diagram_type": null,
  "status": "suspicious",
  "pipeline": ["render-svg", "inspect-svg", "capture-browser"],
  "artifacts": {
    "svg": "render.svg",
    "png": null,
    "browser_png": "browser.png",
    "dom_html": "dom.html",
    "metrics": "metrics.json",
    "findings": "findings.json"
  },
  "scores": {
    "legibility": 2,
    "structural_clarity": 2,
    "spatial_balance": null,
    "visual_taste": null
  },
  "top_findings": [
    "text is too close to the diagram edge for an ER case"
  ],
  "next_action": "human_review_or_visual_judge",
  "judge": {
    "required": true,
    "inputs": {
      "artifacts": ["render.svg", "browser.png", "findings.json", "dom.html"]
    }
  }
}
```

## Field Decisions

### `run_id`

Should exist in every summary. If no explicit run metadata exists yet, the command may derive a deterministic run id from the artifacts directory name.

### `case_id`

Should be nullable for now. Because the command only accepts an artifacts directory, it must not require a registry lookup just to summarize.

### `diagram_type`

Should be nullable for now. Later phases can populate it if upstream steps begin writing run metadata or if metrics artifacts gain a reliable type field.

### `pipeline`

Should reflect actual available pipeline steps, inferred from present artifacts:

- include `render-svg` if `render.svg` exists
- include `inspect-svg` if both `metrics.json` and `findings.json` exist
- include `capture-browser` if `browser.png` exists

### `artifacts`

Should store relative paths, not absolute paths. This keeps the summary portable when the entire artifacts directory moves.

## Status Rules

Phase 3 should not invent an unrelated status system. It should continue the harness tri-state:

- `ok`
- `suspicious`
- `fail`

### Rule sources

Status should be derived from:

- parsed `findings.json`
- parsed `metrics.json`
- presence or absence of browser evidence
- presence or absence of required structural signals in metrics

### Proposed rules

#### `ok`

Return `ok` when:

- required artifacts are present
- there are no findings
- metrics appear structurally valid

#### `suspicious`

Return `suspicious` when:

- one or more findings exist
- required artifacts are present
- the artifact set is otherwise structurally complete enough for review

#### `fail`

Return `fail` when:

- metrics are structurally invalid
- required structural fields are missing
- artifact contents are malformed in ways that indicate a broken run rather than a merely awkward diagram

## `next_action` Enum

Phase 3 should keep `next_action` narrow and stable.

### Allowed values

- `done`
- `capture_browser`
- `human_review_or_visual_judge`
- `repair_and_rerun`

## `next_action` Rules

### `done`

Use when:

- `status=ok`
- there are no actionable findings

### `capture_browser`

Use when:

- `status=suspicious`
- `browser.png` does not exist yet

### `human_review_or_visual_judge`

Use when:

- `status=suspicious`
- `browser.png` already exists

### `repair_and_rerun`

Use when:

- `status=fail`

This holds whether or not browser evidence exists. A failed run should prefer repair over more capture.

## Score Model

Phase 3 should use conservative, rule-based coarse scoring. The purpose is stable machine consumption, not fine-grained aesthetic ranking.

### Dimensions

- `legibility`
- `structural_clarity`
- `spatial_balance`
- `visual_taste`

### Initial behavior

- `visual_taste` should remain `null`
- the other dimensions should be derived from finding ids and coarse severity

### Mapping guidance

#### `legibility`

Driven by findings like:

- text too close to edges
- crowding
- clipping
- label overlap

#### `structural_clarity`

Driven by findings like:

- connector endpoint issues
- relationship marker issues
- lane stability issues
- sequence activation collisions

#### `spatial_balance`

Driven by findings like:

- overflow
- obvious layout skew
- one-sided compression

### Scale

Use `0-3` integer scores only.

Recommended interpretation:

- `3`: no meaningful issue for this dimension
- `2`: mild issue
- `1`: clear issue
- `0`: severe issue

If the current artifact set cannot justify a score, prefer `null` over invention.

## Judge Reservation

Phase 3 should not run a judge, but should prepare a stable slot for future downstream use.

### `judge.required`

Set to `true` when:

- result is `suspicious`
- browser evidence already exists

Set to `false` otherwise.

### `judge.inputs.artifacts`

Should list only artifacts that actually exist and are useful to a downstream reviewer or visual judge.

Preferred ordering:

- `render.svg`
- `browser.png`
- `findings.json`
- `dom.html`

## Testing Strategy

Phase 3 should use a three-layer strategy.

### 1. Artifact reader unit tests

Recommended file:

- `packages/pintora-cli/src/__tests__/harness/artifact-reader.spec.ts`

These tests should verify:

- required files are enforced
- optional files are detected when present
- relative artifact paths are produced
- malformed JSON is rejected

### 2. Summary rules unit tests

Recommended file:

- `packages/pintora-cli/src/__tests__/harness/summary-rules.spec.ts`

These tests should verify:

- `ok -> done`
- `suspicious without browser -> capture_browser`
- `suspicious with browser -> human_review_or_visual_judge`
- `fail -> repair_and_rerun`

### 3. Command orchestration tests

Recommended file:

- `packages/pintora-cli/src/__tests__/harness/summarize-case.spec.ts`

These tests should verify:

- `summary.json` is written
- stdout JSON matches the summary result
- exit code mapping follows status semantics

## Minimal Implementation Slice

Phase 3 should be implemented in four steps.

### Step 1

Add summary contracts and artifact reader.

### Step 2

Add summary rules for status, scores, and `next_action`.

### Step 3

Add the `harness summarize-case` command and `summary.json` writer.

### Step 4

Update `docs/harness/README.md` and run end-to-end summary tests.

## Migration Friendliness

Because summary assembly will likely move out of `@pintora/cli` later, these boundaries should hold:

- no rule logic in `cli.ts`
- no filesystem logic in `summary-rules.ts`
- no judgment logic in `artifact-reader.ts`
- no browser launch or render logic in `summarize-case.ts`

If these boundaries hold, future extraction should only require moving modules and reconnecting a thin command wrapper.

## Decision Summary

Recommended direction:

- keep `summarize-case` in the CLI harness command group for now
- make the artifacts directory the only source of truth
- require `metrics.json` and `findings.json`
- generate `next_action` from rules
- reserve judge input fields without invoking a judge
- keep summary schema small, fixed, and portable
