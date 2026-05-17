# Pintora Agent Observability and Harness Evolution Design

## Status

Draft for review.

This document specifies how to evolve Pintora's existing internal harness into
a local, artifact-first observability substrate for Codex and other coding
agents. It focuses on collecting traces, summarizing agent runs, analyzing
harness outcomes, and preparing the repository for later harness optimization
loops.

## References

- Agentic Harness Engineering: Observability-Driven Automatic Evolution of
  Coding-Agent Harnesses: https://arxiv.org/abs/2604.25850
- Meta-Harness: End-to-End Optimization of Model Harnesses:
  https://arxiv.org/abs/2603.28052

The design borrows three ideas from the AHE paper:

1. Component observability: editable harness components should have explicit,
   file-level representation, so the action space is inspectable and
   revertible.
2. Experience observability: raw agent trajectories should be distilled into a
   layered evidence corpus that future agents can consume.
3. Decision observability: each significant edit should be paired with a
   prediction that can be checked against the next run's outcomes.

It borrows one central idea from Meta-Harness: harness quality can be optimized
from historical execution traces, not only from isolated scores or prompt
editing.

## Project Context

Pintora is a TypeScript text-to-diagram monorepo. The existing harness lives in
`packages/pintora-harness` and already provides the right foundation:

- A case registry at `harness/cases/registry.json`.
- ER and sequence diagram seed cases.
- SVG rendering through the Pintora CLI stack.
- Structural SVG inspection.
- Optional browser capture through Playwright.
- Per-case summaries.
- Review packaging and review-decision ingestion.
- Suite orchestration.

The current high-level flow is:

```text
run-case
  -> render-svg
  -> inspect-svg
  -> summarize-case
  -> capture-browser when summary asks for it
  -> summarize-case again

review-case
  -> review.json

apply-review
  -> review-decision.json

run-suite
  -> per-case run-case
  -> suite.json
```

This design keeps that architecture and adds an outer observability layer. The
outer layer records what the agent tried, what changed in the repo, what
commands ran, which harness cases failed or became suspicious, and what
decision was predicted before the run.

## Problem Statement

The existing harness can validate selected layout quality concerns, but it does
not yet answer these operational questions:

- Which agent tasks repeatedly produce the same harness failures?
- Which cases are reliable signal, and which are noisy?
- Which diagram components are high-risk under agent edits?
- Did a harness rule improve the agent loop, or just add false positives?
- Did an agent's stated plan actually produce the expected outcome?
- What evidence should a later Codex or Claude review consume before changing
  the harness itself?

Without stable traces, harness optimization remains anecdotal. Agents can run
tests, but they cannot learn from a history of failed attempts, rule noise,
case hotspots, and prediction mismatches.

## Goals

1. Generate a stable trace directory for each coding-agent verification run.
2. Link git state, command outcomes, harness artifacts, review decisions, and
   agent predictions under one `run_id`.
3. Preserve local evidence in formats that are easy for agents and humans to
   inspect: JSON, NDJSON, Markdown, SVG, PNG, and HTML.
4. Extend harness summaries so every per-case result has enough metadata for
   cross-run analysis.
5. Add analysis commands that identify case hotspots, finding hotspots, noisy
   rules, and component-risk patterns.
6. Preserve the existing harness boundaries: the harness validates and
   packages evidence; it does not automatically edit production code.
7. Prepare for later Meta-Harness-style outer loops, where an agent proposes
   harness changes based on trace history and a held-out case set.

## Non-Goals

- No automatic code repair loop in the first implementation.
- No production telemetry service.
- No remote dashboard requirement.
- No dependency on a specific LLM vendor tracing SDK.
- No replacement for Jest, snapshot tests, or human visual review.
- No blanket migration of all diagram types into high-precision harness rules.
- No first-phase screenshot diffing or golden-image pass/fail gate.
- No hidden mutation of git state: the trace layer must not stage, commit, or
  reset files.

## Constraints

- Use pnpm only.
- Keep the harness in `packages/pintora-harness`.
- Do not import harness code back into `@pintora/cli`.
- Preserve existing artifact names where possible.
- Store generated run evidence under `artifacts/`, which should remain
  disposable local output unless the user explicitly archives selected runs.
- Avoid vendor lock-in in schema names and command names.
- Keep first-phase implementation useful even when no visual judge exists.

## Current Runtime Blocker

During initial exploration, the harness test suite passed:

```bash
pnpm --filter @pintora/harness test -- --runInBand
```

Observed result:

```text
21 test suites passed
102 tests passed
```

Direct CLI execution exposed a runtime-resolution blocker:

```bash
node packages/pintora-harness/bin/pintora-harness run-suite \
  --suite smoke \
  --artifacts-dir artifacts/harness/obs-smoke \
  --no-capture-browser \
  --max-concurrency 1
```

Observed error:

```text
Cannot find module .../packages/pintora-core/lib/type imported from .../packages/pintora-core/lib/index.js
```

This must be treated as a P0 issue. The observability layer depends on a stable
CLI entrypoint for `run-suite` and `run-case`.

## Proposed Approach

Use an artifact-first local trace layer.

This approach adds small, composable harness commands and schemas:

- `trace-run` creates a complete run directory for one agent verification
  cycle.
- `analyze-runs` aggregates many run directories into an observability report.
- `compare-runs` compares two trace directories.
- Existing per-case summaries are extended with stable case metadata and
  failure signatures.

This is preferred over OpenTelemetry-first instrumentation because Pintora's
immediate need is agent-consumable evidence, not distributed runtime telemetry.
It is also preferred over a hosted dashboard because the useful data already
lives near the repo: source diffs, generated diagrams, findings, summaries, and
review payloads.

## Alternatives Considered

### Alternative A: Wrap Everything in OpenTelemetry

This would represent commands, cases, reviews, and agent decisions as spans.
It would fit a mature observability stack, but it adds a backend dependency and
does not directly solve the agent-consumption problem. Raw traces still need to
be summarized into stable files before they are useful to a coding agent.

Decision: defer. The local schema can later be exported to OpenTelemetry if
needed.

### Alternative B: Only Extend Existing `summary.json`

This is smaller, but it loses run-level context. A per-case summary cannot
answer which code changed, which commands failed before the harness ran, or
whether the agent's prediction was confirmed.

Decision: insufficient by itself, but summary extensions are still required.

### Alternative C: Build a Full Meta-Harness Optimizer Immediately

This would let agents mutate harness code based on historical traces. It is the
long-term direction, but the repository first needs trusted traces, stable
scoring, and a held-out suite.

Decision: defer until after trace collection and analysis are reliable.

## Core Concepts

### Agent Run

An agent run is one verification cycle around a coding-agent task. It may
contain code changes, build/test commands, harness suite execution, review
payloads, and agent predictions.

The run is identified by a stable `run_id`.

Recommended format:

```text
YYYYMMDD-HHMMSS-<task-slug>
```

Example:

```text
20260517-185200-er-label-lane-spacing
```

### Harness Case

A harness case is a diagram input plus metadata from `harness/cases/registry.json`.
Case-level artifacts continue to live under the suite output directory.

### Failure Signature

A failure signature is a stable string used for cross-run grouping.

First version:

```text
<diagram_type>.<primary_finding_code>
```

Example:

```text
er.relationship-label-lane-overlap
```

If no structured finding code exists, use a normalized message slug:

```text
er.message:<slugified-top-finding>
```

### Prediction

A prediction is the agent's explicit, checkable claim before or during a
meaningful change. It states expected improvements, expected unchanged cases,
and known risks.

Predictions are stored in `decisions.ndjson`.

## Trace Directory Layout

Each run writes:

```text
artifacts/agent-runs/<run_id>/
  manifest.json
  task.md
  env.json
  git-before.diff
  git-after.diff
  commands.ndjson
  decisions.ndjson
  harness/
    suite.json
    <case-id>/
      render.svg
      metrics.json
      findings.json
      summary.json
      browser.png
      dom.html
  review/
    payload.json
    review.json
    review-decision.json
  analysis.md
```

Files may be absent only when their producing phase did not run. Missing files
must be explained in `manifest.json`.

## Manifest Schema

`manifest.json` is the top-level index for a run.

```json
{
  "schema_version": 1,
  "run_id": "20260517-185200-er-label-lane-spacing",
  "created_at": "2026-05-17T10:52:00.000Z",
  "repo": "hikerpig/pintora",
  "workspace": "/Users/hikerpig/mydemos/pintora__feat",
  "agent": {
    "name": "codex",
    "model": "unknown",
    "session_id": null
  },
  "task": {
    "title": "Improve ER relationship label lane spacing",
    "source": "user",
    "scope": [
      "packages/pintora-diagrams",
      "packages/pintora-harness"
    ]
  },
  "git": {
    "branch": "codex/agent-observability",
    "commit_before": "0000000000000000000000000000000000000000",
    "commit_after": "1111111111111111111111111111111111111111",
    "dirty_before": false,
    "dirty_after": true,
    "git_before_diff": "git-before.diff",
    "git_after_diff": "git-after.diff"
  },
  "outcome": {
    "compile": "pass",
    "unit_tests": "pass",
    "harness": "suspicious",
    "review": "needs_repair"
  },
  "artifacts": {
    "task": "task.md",
    "env": "env.json",
    "commands": "commands.ndjson",
    "decisions": "decisions.ndjson",
    "harness": "harness/suite.json",
    "analysis": "analysis.md"
  },
  "incomplete_reason": null
}
```

Allowed outcome values:

- `pass`
- `fail`
- `skipped`
- `not_run`
- `failed_to_start`
- `ok`
- `suspicious`
- `needs_review`
- `needs_repair`
- `unknown`

The first implementation may keep these as strings rather than a deeply nested
typed taxonomy, but tests must lock the accepted values used by the writer.

## Environment Schema

`env.json` records enough information to reproduce command behavior without
capturing secrets.

```json
{
  "schema_version": 1,
  "node": "v25.0.0",
  "pnpm": "9.15.9",
  "platform": "darwin",
  "arch": "arm64",
  "timezone": "Asia/Shanghai",
  "cwd": "/Users/hikerpig/mydemos/pintora__feat",
  "package_manager": "pnpm@9.15.9"
}
```

Environment capture must not dump arbitrary environment variables.

## Command Trace Schema

`commands.ndjson` records important command executions:

```json
{"schema_version":1,"ts":"2026-05-17T10:52:01.000Z","cmd":"pnpm compile","cwd":".","exit_code":0,"duration_ms":931,"phase":"build","summary":"9 packages compiled"}
{"schema_version":1,"ts":"2026-05-17T10:52:04.000Z","cmd":"pnpm --filter @pintora/harness test -- --runInBand","cwd":".","exit_code":0,"duration_ms":3107,"phase":"test","summary":"21 suites passed, 102 tests passed"}
{"schema_version":1,"ts":"2026-05-17T10:52:09.000Z","cmd":"pintora-harness run-suite --suite all --artifacts-dir artifacts/agent-runs/20260517-185200-er-label-lane-spacing/harness","cwd":".","exit_code":10,"duration_ms":12000,"phase":"harness","summary":"4 ok, 2 suspicious, 0 fail"}
```

Required fields:

- `schema_version`
- `ts`
- `cmd`
- `cwd`
- `exit_code`
- `duration_ms`
- `phase`
- `summary`

Optional fields:

- `stdout_excerpt`
- `stderr_excerpt`
- `artifact_refs`

Full stdout/stderr capture is not required in the first version. If excerpts
are stored, each excerpt should be bounded to avoid large trace directories.

## Decision Trace Schema

`decisions.ndjson` records prediction and verification events:

```json
{
  "schema_version": 1,
  "ts": "2026-05-17T10:51:00.000Z",
  "kind": "prediction",
  "id": "prediction-001",
  "change_scope": [
    "packages/pintora-diagrams/src/er"
  ],
  "claim": "Increasing relationship label lane clearance should reduce edge-label overlap findings.",
  "expected_improve": [
    "er.relationship-label-lane-01"
  ],
  "expected_unchanged": [
    "er.relationship-spacing-01"
  ],
  "risk": "May increase total diagram width.",
  "verification": {
    "command": "pintora-harness run-suite --suite all",
    "status": "pending"
  }
}
```

After a run is analyzed, a result event can be appended:

```json
{
  "schema_version": 1,
  "ts": "2026-05-17T10:54:00.000Z",
  "kind": "prediction_result",
  "prediction_ref": "prediction-001",
  "result": "partially_confirmed",
  "evidence": [
    "er.relationship-label-lane-01 moved suspicious -> ok",
    "er.relationship-spacing-01 stayed ok"
  ]
}
```

Allowed prediction results:

- `confirmed`
- `partially_confirmed`
- `disconfirmed`
- `inconclusive`

## Summary Schema Extensions

Current `summary.json` should be extended so each case can be analyzed across
runs.

Target shape:

```json
{
  "run_id": "er.relationship-label-lane-01",
  "case_id": "er.relationship-label-lane-01",
  "diagram_type": "er",
  "status": "suspicious",
  "pipeline": [
    "render-svg",
    "inspect-svg",
    "capture-browser"
  ],
  "failure_signature": "er.relationship-label-lane-overlap",
  "suspected_component": "packages/pintora-diagrams/src/er",
  "artifacts": {
    "svg": "render.svg",
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
    "relationship label overlaps edge lane"
  ],
  "next_action": "human_review_or_visual_judge",
  "judge": {
    "required": true,
    "inputs": {
      "artifacts": [
        "render.svg",
        "browser.png",
        "findings.json",
        "dom.html"
      ]
    }
  }
}
```

Rules:

- `case_id` must be populated when `run-case` is invoked with `--case`.
- `diagram_type` must come from the registry when available.
- `failure_signature` must be `null` when status is `ok`.
- `suspected_component` may be inferred from `diagram_type` in version one.
- Existing fields must remain backward-compatible.

Initial `suspected_component` mapping:

```json
{
  "er": "packages/pintora-diagrams/src/er",
  "sequence": "packages/pintora-diagrams/src/sequence"
}
```

## CLI Additions

### `trace-run`

Command:

```bash
pintora-harness trace-run \
  --task "Improve ER relationship label lane spacing" \
  --suite all \
  --out artifacts/agent-runs
```

Options:

- `--task <text>`: required human-readable task title.
- `--suite <name>`: defaults to `smoke`.
- `--out <dir>`: defaults to `artifacts/agent-runs`.
- `--run-id <id>`: optional explicit run id.
- `--no-compile`: skip `pnpm compile`.
- `--no-tests`: skip harness package tests.
- `--no-capture-browser`: forwarded to `run-suite`.
- `--max-concurrency <n>`: forwarded to `run-suite`.

Responsibilities:

1. Create a run directory.
2. Write `task.md`.
3. Write `env.json`.
4. Capture initial git state and `git-before.diff`.
5. Run configured build/test commands.
6. Run `run-suite` into `<run-dir>/harness`.
7. Capture final git state and `git-after.diff`.
8. Write `commands.ndjson`.
9. Write `manifest.json`.
10. Write initial `analysis.md`.

`trace-run` must not stage or commit files.

### `analyze-runs`

Command:

```bash
pintora-harness analyze-runs \
  --runs artifacts/agent-runs \
  --out artifacts/harness/observability-report.json
```

Responsibilities:

1. Discover run directories.
2. Read manifests, suite summaries, case summaries, findings, and decisions.
3. Skip incomplete runs with warnings in the report.
4. Aggregate case hotspots.
5. Aggregate finding hotspots.
6. Identify rule-noise candidates when review decisions provide enough signal.
7. Identify component-risk candidates from changed files and failing cases.
8. Emit JSON report.

Output shape:

```json
{
  "schema_version": 1,
  "generated_at": "2026-05-17T11:00:00.000Z",
  "total_runs": 12,
  "complete_runs": 10,
  "incomplete_runs": 2,
  "case_hotspots": [
    {
      "case_id": "er.relationship-label-lane-01",
      "ok": 3,
      "suspicious": 7,
      "fail": 0
    }
  ],
  "finding_hotspots": [
    {
      "failure_signature": "er.relationship-label-lane-overlap",
      "count": 6
    }
  ],
  "rule_noise_candidates": [
    {
      "finding_code": "sequence.message-label-collision",
      "false_positive_rate": 0.42,
      "sample_size": 12
    }
  ],
  "component_risk": [
    {
      "path": "packages/pintora-diagrams/src/er",
      "regression_runs": 4
    }
  ],
  "prediction_quality": {
    "confirmed": 3,
    "partially_confirmed": 2,
    "disconfirmed": 1,
    "inconclusive": 4
  }
}
```

### `compare-runs`

Command:

```bash
pintora-harness compare-runs \
  --base artifacts/agent-runs/<base-run> \
  --head artifacts/agent-runs/<head-run>
```

Responsibilities:

1. Compare per-case statuses.
2. Compare finding signatures.
3. Compare command outcomes.
4. Report improved, regressed, unchanged, and missing cases.

Output shape:

```json
{
  "schema_version": 1,
  "base": "20260517-120000-before",
  "head": "20260517-130000-after",
  "improved": [
    {
      "case_id": "er.relationship-label-lane-01",
      "from": "suspicious",
      "to": "ok"
    }
  ],
  "regressed": [],
  "unchanged": [
    {
      "case_id": "er.relationship-spacing-01",
      "status": "ok"
    }
  ],
  "missing": []
}
```

## Module Layout

New modules should stay inside `packages/pintora-harness/src`.

Proposed layout:

```text
packages/pintora-harness/src/trace/
  trace-contracts.ts
  trace-run.ts
  manifest-writer.ts
  env-capture.ts
  git-capture.ts
  command-runner.ts
  analysis-writer.ts

packages/pintora-harness/src/analysis/
  analyze-runs.ts
  compare-runs.ts
  run-reader.ts
  hotspot-analysis.ts
  prediction-analysis.ts
```

Existing modules to extend:

```text
packages/pintora-harness/src/cli.ts
packages/pintora-harness/src/orchestration/run-case.ts
packages/pintora-harness/src/orchestration/run-suite.ts
packages/pintora-harness/src/summary/summarize-case.ts
packages/pintora-harness/src/summary/summary-rules.ts
packages/pintora-harness/src/contracts/summary.ts
```

## Data Flow

```text
Codex task
  -> edits repository
  -> trace-run
     -> capture env
     -> capture git-before
     -> run compile
     -> run focused tests
     -> run harness suite
     -> capture git-after
     -> write manifest
     -> write analysis
  -> optional review-case
  -> optional apply-review
  -> analyze-runs across history
  -> propose harness improvements
```

## Analysis Semantics

### Case Hotspot

A case becomes a hotspot when it is suspicious or failed in multiple complete
runs.

First version ranking:

```text
score = fail_count * 3 + suspicious_count
```

### Finding Hotspot

A finding hotspot groups by `failure_signature`.

If multiple findings exist, use all finding signatures for frequency counts,
but use the first finding as the case's primary failure signature.

### Rule Noise Candidate

A rule is a noise candidate when review decisions often accept cases that the
harness marked suspicious.

First version requires at least five reviewed examples before calculating a
false-positive rate.

### Component Risk

Component risk is inferred from changed files and harness regressions.

First version:

- Parse `git-after.diff` paths.
- Map changed paths to package/module prefixes.
- Count runs where changed paths correlate with new suspicious/fail cases.

This is heuristic and must be presented as a lead, not proof.

### Prediction Quality

Predictions are evaluated by comparing expected cases against observed case
status transitions.

Rules:

- `confirmed`: all expected improvements improved, and all expected unchanged
  cases did not regress.
- `partially_confirmed`: at least one expected improvement improved, and no
  critical regression occurred.
- `disconfirmed`: expected improvement regressed, or expected unchanged case
  regressed.
- `inconclusive`: required case data is missing.

## Error Handling

`trace-run` must write a manifest even when a command fails.

Failure behavior:

- If compile fails, unit tests and harness can be skipped.
- If unit tests fail, harness may still run only when explicitly configured.
- If harness CLI fails to start, outcome is `failed_to_start`.
- If one case fails inside `run-suite`, remaining cases should still run.
- If an expected artifact is missing, analysis marks the run incomplete.
- If JSON is malformed, analysis records the file path and skips that run.

No command should delete prior run directories unless the user explicitly asks
for cleanup.

## Privacy and Data Hygiene

The trace layer must not capture arbitrary environment variables.

Allowed:

- Node version
- pnpm version
- platform
- architecture
- timezone
- package manager field
- cwd

Not allowed by default:

- API keys
- auth tokens
- full shell environment
- full agent prompt transcript
- unrelated user files

If future work captures agent conversation summaries, they must be opt-in and
bounded.

## Test Strategy

### Unit Tests

Add tests for:

- run id generation
- manifest writer
- environment capture allowlist
- command NDJSON writer
- git diff capture behavior with clean and dirty worktrees
- failure signature derivation
- summary extension with registry metadata
- analyze-runs incomplete-run handling
- case hotspot ranking
- finding hotspot aggregation
- compare-runs status transitions
- prediction result classification

### Integration Tests

Add tests for:

- `trace-run` using mock commands.
- `trace-run` writing manifest after a failing command.
- `analyze-runs` over fixture trace directories.
- `compare-runs` over fixture trace directories.
- CLI argument parsing for all new commands.

### Manual Verification

Expected manual checks after implementation:

```bash
pnpm --filter @pintora/harness test -- --runInBand
pnpm compile
node packages/pintora-harness/bin/pintora-harness run-suite \
  --suite smoke \
  --artifacts-dir artifacts/harness/manual-smoke \
  --no-capture-browser
node packages/pintora-harness/bin/pintora-harness trace-run \
  --task "manual smoke trace" \
  --suite smoke \
  --out artifacts/agent-runs \
  --no-capture-browser
node packages/pintora-harness/bin/pintora-harness analyze-runs \
  --runs artifacts/agent-runs \
  --out artifacts/harness/observability-report.json
```

## Rollout Plan

### P0: Make Existing Harness CLI Runnable

Fix the runtime-resolution problem so this command works reliably:

```bash
node packages/pintora-harness/bin/pintora-harness run-suite \
  --suite smoke \
  --artifacts-dir artifacts/harness/obs-smoke \
  --no-capture-browser
```

Acceptance:

- CLI run-suite works from repository root.
- Existing harness tests still pass.
- No npm or yarn artifacts are introduced.

### P1: Add Trace Contracts and `trace-run`

Implement trace directory creation and minimal verification capture.

Acceptance:

- `trace-run` creates `manifest.json`, `task.md`, `env.json`,
  `commands.ndjson`, `git-before.diff`, `git-after.diff`, `analysis.md`.
- Failed commands still produce a manifest.
- No secrets are captured from the environment.

### P2: Extend Per-Case Summary Metadata

Populate case metadata and failure signatures.

Acceptance:

- `summary.json` includes `case_id` and `diagram_type` for registry cases.
- `failure_signature` is stable for suspicious/fail cases.
- Existing summary consumers continue to work.

### P3: Add `analyze-runs`

Aggregate historical traces.

Acceptance:

- Report includes case hotspots and finding hotspots.
- Incomplete runs are counted and skipped safely.
- Analysis works on fixture data without needing Playwright.

### P4: Add `compare-runs`

Support before/after harness comparison.

Acceptance:

- Improved, regressed, unchanged, and missing cases are reported.
- Command exits nonzero only for invalid inputs, not for regressions.

### P5: Add Decision Observability

Record and evaluate predictions.

Acceptance:

- `decisions.ndjson` supports prediction and prediction-result entries.
- `analyze-runs` reports prediction quality.
- Prediction evaluation is conservative and marks missing evidence
  inconclusive.

### P6: Prepare Meta-Harness Outer Loop

Only after enough trace history exists, add tooling that prepares candidate
harness-improvement briefs for agent review.

Acceptance:

- The tool proposes harness changes from historical evidence.
- It does not edit files automatically in first version.
- Proposals cite trace runs and cases.

## Acceptance Criteria for the Full Design

The design is complete when:

1. A Codex verification run can be represented as a single trace directory.
2. A reviewer can inspect the trace directory and understand what changed,
   which commands ran, which cases failed, and what evidence was produced.
3. Cross-run analysis can identify repeated harness failures.
4. Summary metadata is sufficient to group failures by case, diagram type, and
   finding signature.
5. Agent predictions can be recorded and later classified.
6. The implementation remains local-first and does not require a hosted
   observability service.

## Risks

### Risk: Trace Volume Grows Too Quickly

Mitigation:

- Keep stdout/stderr excerpts bounded.
- Store screenshots only when capture is triggered.
- Add future cleanup commands after the trace format stabilizes.

### Risk: False Precision in Analysis

Mitigation:

- Label component-risk output as heuristic.
- Require minimum sample sizes for noise-rate calculations.
- Keep raw evidence links in reports.

### Risk: Harness Rules Overfit Current Cases

Mitigation:

- Separate smoke, all, and future held-out suites.
- Use `compare-runs` before accepting rule changes.
- Preserve human review for snapshot-like visual changes.

### Risk: Agents Optimize for Harness Score Only

Mitigation:

- Keep Jest and compile in the trace.
- Require prediction/risk statements for meaningful changes.
- Keep review payloads tied to artifacts, not only scores.

## Open Decisions

1. Whether `trace-run` should record only verification-phase evidence, or also
   accept a bounded agent planning summary.
2. Whether selected trace runs should ever be checked into the repository as
   fixtures, or always remain local artifacts.
3. Whether browser capture should be enabled by default for `trace-run smoke`,
   or only for suspicious cases as today.
4. Whether a future held-out suite should live in the same registry with a
   `heldout` tag, or in a separate registry file.

## Recommended First Implementation Slice

The first implementation should be deliberately narrow:

1. Fix the harness CLI runtime blocker.
2. Add summary metadata for `case_id` and `diagram_type`.
3. Add `trace-run` with manifest, env, git diff, commands, and harness suite
   capture.
4. Add tests around trace writing and failure behavior.

This slice produces useful evidence immediately and gives later analysis work a
stable on-disk corpus.
