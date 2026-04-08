# Pintora Harness Orchestration Design

Date: 2026-04-08

## Goal

Add an orchestration layer to `@pintora/harness` so the harness can run complete case pipelines instead of only exposing individual step commands.

This phase introduces:

- `pintora-harness run-case`
- `pintora-harness run-suite`

The orchestration layer should:

- execute the existing single-step commands in a fixed order
- automatically decide whether browser capture should be triggered
- preserve the existing artifact contracts
- produce stable machine-readable outputs for agents and batch workflows

## Non-Goals

This phase does not include:

- visual judge integration
- human review UI
- preview server lifecycle management
- distributed execution
- multi-browser testing matrices
- public package publishing changes

## Current Context

The harness runtime has already been extracted out of `@pintora/cli` into `@pintora/harness`.

Current single-step commands are:

- `render-svg`
- `inspect-svg`
- `capture-browser`
- `summarize-case`

These commands work independently, but there is no orchestration layer that:

- ties them together into one case run
- promotes suspicious cases to browser evidence automatically
- batches multiple cases under one suite-level summary

That orchestration gap is the focus of this phase.

## Design Principles

### Reuse Existing Commands and Rules

The orchestration layer should not reimplement rendering, inspection, capture, or summary logic.

Instead it should compose the existing runtime functions:

- `runHarnessRenderSvg`
- `runHarnessInspectSvg`
- `runHarnessCaptureBrowser`
- `runHarnessSummarizeCase`

Rule-based escalation must continue to come from `summary.json`, not from duplicated orchestration-only heuristics.

### Preserve Existing Artifact Contracts

The existing per-case artifact filenames remain unchanged:

- `render.svg`
- `metrics.json`
- `findings.json`
- `browser.png` optional
- `dom.html` optional
- `summary.json`

The new orchestration layer may add suite-level files, but it must not change these per-case contracts.

### Make `run-case` the Primitive

`run-case` should own all single-case decision logic.

`run-suite` should be a batch shell that:

- selects cases
- invokes `run-case`
- aggregates outputs
- computes suite-level status

This keeps the strategy in one place and avoids duplicating orchestration rules.

## Command Surface

### `run-case`

Recommended command shape:

```bash
pintora-harness run-case \
  --case er.relationship-spacing-01 \
  --artifacts-dir artifacts/harness/dev/er.relationship-spacing-01
```

Supported inputs:

- `--case <id>`
- `--input <file>`

Exactly one of them must be provided.

Recommended options:

- `--case`
- `--input`
- `--artifacts-dir`
- `--base-url`
- `--viewport`
- `--no-capture-browser`

`--base-url` and `--viewport` are only forwarded to browser capture.

`--no-capture-browser` disables automatic browser escalation even when `summary.next_action` asks for it.

### `run-suite`

Recommended command shape:

```bash
pintora-harness run-suite \
  --suite smoke \
  --artifacts-dir artifacts/harness/smoke-run
```

Recommended options:

- `--suite`
- `--artifacts-dir`
- `--base-url`
- `--viewport`
- `--no-capture-browser`
- `--max-concurrency`

The first version should keep selection conservative and controlled.

Recommended supported suite selectors:

- `--suite smoke`
- `--suite all`

Additional selectors such as tags may be added later, but they are not required in this phase.

## Artifact Layout

### Case Runs

`run-case` should always write into one dedicated case artifact directory.

Recommended layout:

- case mode:
  `artifacts/harness/<run-id>/<case-id>/`
- input mode:
  `artifacts/harness/<run-id>/input/`

Within that directory, the existing artifact names remain unchanged.

### Suite Runs

`run-suite` should allocate one root run directory and then one subdirectory per case.

Recommended layout:

- `artifacts/harness/<suite-run-id>/suite.json`
- `artifacts/harness/<suite-run-id>/<case-id>/render.svg`
- `artifacts/harness/<suite-run-id>/<case-id>/metrics.json`
- `artifacts/harness/<suite-run-id>/<case-id>/findings.json`
- `artifacts/harness/<suite-run-id>/<case-id>/browser.png` optional
- `artifacts/harness/<suite-run-id>/<case-id>/dom.html` optional
- `artifacts/harness/<suite-run-id>/<case-id>/summary.json`

This phase only requires `suite.json`.

`cases.jsonl` is intentionally deferred.

## Internal Modules

Recommended new modules inside `packages/pintora-harness/src/orchestration/`:

- `run-case.ts`
- `run-suite.ts`
- `case-runner.ts`
- `suite-selector.ts`
- `run-contracts.ts`

Responsibilities:

- `run-case.ts`
  CLI-facing orchestration for one case or one explicit input
- `run-suite.ts`
  CLI-facing orchestration for batch execution
- `case-runner.ts`
  pure orchestration runtime for a single case pipeline
- `suite-selector.ts`
  maps suite names to case ids
- `run-contracts.ts`
  defines stable output types for `run-case` and `run-suite`

The existing modules remain the source of truth for step behavior:

- `rendering/render-svg.ts`
- `inspection/inspect-svg.ts`
- `browser/capture-browser.ts`
- `summary/summarize-case.ts`

## `run-case` State Machine

The `run-case` pipeline should be fixed and deterministic:

1. resolve input source and target artifact directory
2. execute `render-svg`
3. execute `inspect-svg`
4. execute the first `summarize-case`
5. read `summary.next_action`
6. if `next_action === "capture_browser"` and browser capture is not disabled:
   execute `capture-browser`
7. execute `summarize-case` again to produce the final summary
8. return the final case result

This design intentionally makes `summary.json` the orchestration decision boundary.

That matters because future judge integration can change how `next_action` is derived without forcing a redesign of orchestration.

## `run-suite` Behavior

The first version should stay conservative:

- default `max-concurrency` is `1`
- one case failure must not abort the whole suite
- suite execution continues through all selected cases

`run-suite` should:

1. resolve a case list from `suite-selector`
2. create the suite root artifact directory
3. invoke `run-case` for each selected case
4. collect each case result
5. write `suite.json`
6. set overall exit code based on the worst case result

Recommended suite exit-code policy:

- any `fail` case -> `20`
- otherwise any `suspicious` case -> `10`
- otherwise -> `0`

## Output Contracts

### `run-case` stdout JSON

Recommended fields:

```json
{
  "status": "suspicious",
  "nextAction": "capture_browser",
  "artifactsDir": "artifacts/harness/dev/er.relationship-spacing-01",
  "summary": "summary.json",
  "captureBrowserTriggered": true
}
```

The exact field naming should remain stable once implemented.

### `suite.json`

Recommended structure:

```json
{
  "suite": "smoke",
  "total": 2,
  "ok": 0,
  "suspicious": 2,
  "fail": 0,
  "captureBrowserTriggeredCount": 1,
  "cases": [
    {
      "caseId": "er.relationship-spacing-01",
      "status": "suspicious",
      "summary": "er.relationship-spacing-01/summary.json"
    }
  ]
}
```

The first version should keep suite output small and stable.

Do not embed all per-case findings in `suite.json`.

## Error Handling

### `run-case`

If any required step throws:

- the command should stop for that case
- partial artifacts already written may remain on disk
- the command should exit non-zero

If browser capture is requested by `summary.next_action` but capture fails:

- the case should be treated as failed for that run
- the error should not be silently downgraded

This phase should favor explicit failure over partial success with ambiguous evidence.

### `run-suite`

If a single case fails unexpectedly:

- record the case as failed in suite aggregation
- continue executing the remaining cases

If suite selection resolves no cases:

- fail fast with a user-facing error
- do not generate an empty successful suite result

## Testing Strategy

### `run-case` orchestration tests

Mock the underlying step functions and verify:

- fixed execution order
- automatic browser escalation when `next_action === "capture_browser"`
- second summary generation after browser capture
- `--no-capture-browser` suppresses automatic capture

### `run-suite` orchestration tests

Mock `run-case` and verify:

- suite selector behavior
- aggregation counts
- non-blocking continuation after one case failure
- final exit code derived from worst result

### minimal real integration test

Add at least one real case integration test for:

- `run-case --case ...`

Verify the resulting artifact directory contains:

- `render.svg`
- `metrics.json`
- `findings.json`
- `summary.json`

Real preview-backed browser capture smoke is not required for automated verification in this phase.

If a stable preview service is available locally, it may be used as an additional manual smoke check.

## Risks and Tradeoffs

### Risk: orchestration accidentally duplicates summary rules

Mitigation:

- only branch on `summary.next_action`
- keep capture escalation rules out of orchestration code

### Risk: suite output becomes too large or unstable

Mitigation:

- keep `suite.json` compact
- reference per-case summaries instead of embedding all details

### Risk: concurrency adds nondeterminism too early

Mitigation:

- default to serial execution
- reserve `--max-concurrency` as a controlled extension point

## Acceptance Criteria

This phase is complete when:

- `@pintora/harness` exposes `run-case`
- `@pintora/harness` exposes `run-suite`
- `run-case` automatically triggers browser capture when summary requests it
- `run-case` rewrites `summary.json` after browser capture
- `run-suite` aggregates multiple case runs into `suite.json`
- suite exit codes match worst-case status
- existing single-step commands remain unchanged
