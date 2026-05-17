# Agent Observability Harness Usage Guide

This guide explains how a human maintainer should use Pintora's harness and
trace artifacts while working with Codex or another coding agent.

The goal is simple: after an agent changes layout or harness code, you should
be able to answer three questions from local artifacts:

1. What did the agent try?
2. What commands and harness cases ran?
3. What evidence should guide the next repair or review?

## When to Use It

Use this workflow when an agent changes any of these areas:

- diagram layout behavior in `packages/pintora-diagrams`
- rendering behavior in `packages/pintora-renderer`
- harness rules, cases, summaries, or review packaging
- docs or examples where diagram quality matters

For a tiny non-layout edit, normal `pnpm test` may be enough. For anything that
could change diagram structure or visual legibility, run the harness as well.

## Setup

From the repository root:

```bash
pnpm install
pnpm compile
```

During local development, use the package bin directly:

```bash
node packages/pintora-harness/bin/pintora-harness --help
```

If the package is linked or installed in a tool environment, the shorter
`pintora-harness` command is equivalent.

## Fast Check: Run the Smoke Suite

Use this after an agent makes a focused change:

```bash
node packages/pintora-harness/bin/pintora-harness run-suite \
  --suite smoke \
  --artifacts-dir artifacts/harness/smoke-run \
  --no-capture-browser \
  --max-concurrency 1
```

Outputs:

```text
artifacts/harness/smoke-run/
  suite.json
  er.relationship-spacing-01/
    render.svg
    metrics.json
    findings.json
    summary.json
  sequence.lifeline-label-separation-01/
    render.svg
    metrics.json
    findings.json
    summary.json
```

Exit codes:

- `0`: all selected cases are ok
- `10`: at least one case is suspicious
- `20`: at least one case failed

An exit code of `20` is not automatically a tooling failure. Check
`suite.json` and each case's `summary.json` to see which case failed and why.

## Full Agent Trace: `trace-run`

Use `trace-run` when you want a durable record of an agent development attempt.
This is the preferred command before asking another agent or reviewer to
continue the work.

```bash
node packages/pintora-harness/bin/pintora-harness trace-run \
  --task "improve ER relationship label spacing" \
  --suite smoke \
  --out artifacts/agent-runs \
  --no-capture-browser \
  --max-concurrency 1
```

For a reproducible run id:

```bash
node packages/pintora-harness/bin/pintora-harness trace-run \
  --task "improve ER relationship label spacing" \
  --suite smoke \
  --out artifacts/agent-runs \
  --run-id 20260517-er-label-spacing \
  --no-capture-browser \
  --max-concurrency 1
```

`trace-run` performs:

1. environment capture
2. git state and diff capture
3. `pnpm compile`
4. `pnpm --filter @pintora/harness test -- --runInBand`
5. harness suite execution
6. manifest and analysis writing

It writes:

```text
artifacts/agent-runs/<run-id>/
  manifest.json
  task.md
  env.json
  git-before.diff
  git-after.diff
  commands.ndjson
  decisions.ndjson
  analysis.md
  harness/
    suite.json
    <case-id>/
      render.svg
      metrics.json
      findings.json
      summary.json
```

The `artifacts/` directory is ignored by git. It is local evidence, not source
code.

## Reading the Trace

Start with `manifest.json`.

Important fields:

```json
{
  "run_id": "20260517-er-label-spacing",
  "outcome": {
    "compile": "pass",
    "unit_tests": "pass",
    "harness": "suspicious",
    "review": "not_run"
  },
  "artifacts": {
    "commands": "commands.ndjson",
    "harness": "harness/suite.json",
    "analysis": "analysis.md"
  },
  "incomplete_reason": null
}
```

How to interpret it:

- `compile: fail`: fix TypeScript/build issues before trusting harness results.
- `unit_tests: fail`: fix harness tests before interpreting layout evidence.
- `harness: ok`: selected cases passed structural checks.
- `harness: suspicious`: inspect case summaries and, when available,
  screenshots.
- `harness: fail`: inspect `summary.json`, `findings.json`, and `render.svg`.
- `review: not_run`: no human or downstream review decision has been applied.

Then inspect `commands.ndjson`. Each line records one command or phase:

```json
{"phase":"build","cmd":"pnpm compile","exit_code":0,"summary":"compile"}
{"phase":"test","cmd":"pnpm --filter @pintora/harness test -- --runInBand","exit_code":0,"summary":"unit tests"}
{"phase":"harness","cmd":"runHarnessSuite smoke","exit_code":10,"summary":"1 ok, 1 suspicious, 0 fail"}
```

Use `analysis.md` for a quick human-readable rollup, but use JSON files when
you need exact evidence.

## Reading Case Summaries

Each case has a `summary.json`:

```json
{
  "case_id": "er.relationship-spacing-01",
  "diagram_type": "er",
  "status": "fail",
  "failure_signature": "er.svg-structure-fail",
  "suspected_component": "packages/pintora-diagrams/src/er",
  "top_findings": [],
  "next_action": "repair_and_rerun"
}
```

Key fields:

- `case_id`: stable harness case id.
- `diagram_type`: currently `er` or `sequence` for registry cases.
- `status`: `ok`, `suspicious`, or `fail`.
- `failure_signature`: grouping key for repeated failures.
- `suspected_component`: first place to inspect, not proof of root cause.
- `top_findings`: short list of structural issues.
- `next_action`: suggested next pipeline step.

If `next_action` is `capture_browser`, rerun without `--no-capture-browser`
after starting the preview server.

## Browser Evidence

Browser capture requires the demo preview page to be running.

Start the demo:

```bash
pnpm demo:dev
```

Then run a case or suite without `--no-capture-browser`:

```bash
node packages/pintora-harness/bin/pintora-harness run-case \
  --case er.relationship-spacing-01 \
  --artifacts-dir artifacts/harness/dev/er.relationship-spacing-01
```

Browser capture adds:

```text
browser.png
dom.html
```

Use `browser.png` for visual review and `dom.html` for debugging rendered SVG
structure in context.

## Human Review Pack

When a case is suspicious and needs a human or external agent decision:

```bash
node packages/pintora-harness/bin/pintora-harness review-case \
  --artifacts artifacts/harness/dev/er.relationship-spacing-01 \
  --adapter manual-review-pack \
  --out artifacts/harness/dev/er.relationship-spacing-01/review.json
```

This creates:

```text
review.json
review-pack/payload.json
review-pack/README.md
```

Give the `review-pack` directory to a reviewer. After a review decision exists,
consume it:

```bash
node packages/pintora-harness/bin/pintora-harness apply-review \
  --artifacts artifacts/harness/dev/er.relationship-spacing-01 \
  --review artifacts/harness/dev/er.relationship-spacing-01/review.json \
  --out artifacts/harness/dev/er.relationship-spacing-01/review-decision.json
```

`review-decision.json` becomes the stable handoff for the next step:

- `accept`: no repair needed
- `repair`: change code or diagram source, then rerun
- `rerun`: rerun the harness
- `escalate`: ask for stronger human or visual-model review

## Recommended Human Workflow

After an agent finishes a meaningful change:

1. Run the trace:

   ```bash
   node packages/pintora-harness/bin/pintora-harness trace-run \
     --task "<short task description>" \
     --suite smoke \
     --out artifacts/agent-runs \
     --no-capture-browser \
     --max-concurrency 1
   ```

2. Open `artifacts/agent-runs/<run-id>/manifest.json`.

3. If `compile` or `unit_tests` failed, fix those first.

4. If `harness` is `suspicious` or `fail`, open:

   ```text
   artifacts/agent-runs/<run-id>/harness/suite.json
   artifacts/agent-runs/<run-id>/harness/<case-id>/summary.json
   artifacts/agent-runs/<run-id>/harness/<case-id>/render.svg
   artifacts/agent-runs/<run-id>/harness/<case-id>/findings.json
   ```

5. Use `failure_signature` to compare with previous runs.

6. Ask the next agent to start from the trace directory, not from a vague
   description.

Example prompt for a follow-up agent:

```text
Use artifacts/agent-runs/20260517-er-label-spacing as evidence.
Read manifest.json, commands.ndjson, harness/suite.json, and the failing case
summary. Propose the smallest repair that changes the suspected component and
then rerun the harness.
```

## Common Situations

### `trace-run` returns completed but harness is suspicious

This means trace collection succeeded. The harness result is evidence inside
the manifest:

```json
{
  "outcome": {
    "harness": "suspicious"
  }
}
```

Inspect the case summaries before deciding whether to repair.

### `run-suite` exits 20

At least one case has `status: fail`. This can be a real layout/rendering issue
or a known existing harness case. Check `suite.json` before treating it as a
tooling failure.

### A newly created file is not staged

`trace-run` still records untracked text files in `git-before.diff` and
`git-after.diff`. This is intentional because agent sessions often validate
dirty work before staging.

### You want faster feedback

Use `--suite smoke --no-capture-browser`.

### You want stronger visual evidence

Start `pnpm demo:dev`, then omit `--no-capture-browser`.

## What Not to Do

- Do not run Jest with `--updateSnapshot` automatically.
- Do not treat `suspected_component` as proof of root cause.
- Do not commit `artifacts/` unless intentionally archiving a small fixture.
- Do not skip compile/test outcomes and only look at screenshots.
- Do not compare runs by memory; compare `manifest.json`, `suite.json`, and
  `failure_signature`.

## Current Limitations

- There is no `analyze-runs` command yet.
- There is no `compare-runs` command yet.
- There is no visual model judge integration yet.
- Browser capture depends on a running preview server.
- The smoke suite is intentionally small; use `--suite all` when you need
  broader coverage.

