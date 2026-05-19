# Harness CLI

Human-oriented usage guide: see
[`docs/agent-observability-harness-usage.md`](../../docs/agent-observability-harness-usage.md).

## Commands

### Individual Steps

- `pintora-harness render-svg --case er.relationship-spacing-01 --out artifacts/harness/dev/render.svg`
- `pintora-harness inspect-svg --in artifacts/harness/dev/render.svg --case er.relationship-spacing-01 --out-dir artifacts/harness/dev`
- `pintora-harness capture-browser --case er.relationship-spacing-01 --out-dir artifacts/harness/dev`
- `pintora-harness capture-browser --input ./tmp/case.pintora --out-dir artifacts/harness/dev --base-url http://localhost:3001/demo/preview/ --viewport 1440x960`
- `pintora-harness summarize-case --artifacts artifacts/harness/dev --out artifacts/harness/dev/summary.json`
- `pintora-harness review-case --artifacts artifacts/harness/dev --adapter manual-review-pack --out artifacts/harness/dev/review.json`
- `pintora-harness review-case --artifacts artifacts/harness/dev --adapter noop --out artifacts/harness/dev/review.json`
- `pintora-harness apply-review --artifacts artifacts/harness/dev --review artifacts/harness/dev/review.json --out artifacts/harness/dev/review-decision.json`

### Orchestration

- `pintora-harness run-case --case er.relationship-spacing-01 --artifacts-dir artifacts/harness/dev/er.relationship-spacing-01`
- `pintora-harness run-suite --suite smoke --artifacts-dir artifacts/harness/smoke-run`
- `pintora-harness trace-run --task "manual smoke" --suite smoke --out artifacts/agent-runs`
- `pintora-harness trace-agent-event --run artifacts/agent-runs/<run-id> --kind constraint_check --phase context --summary "Read package AGENTS.md" --data '{"constraint_id":"package-agents-before-edit","status":"observed"}'`
- `pintora-harness summarize-agent-run --run artifacts/agent-runs/<run-id>`
- `pintora-harness analyze-runs --runs artifacts/agent-runs --out artifacts/harness/observability-report.json`
- `pintora-harness compare-runs --base artifacts/agent-runs/<base-run> --head artifacts/agent-runs/<head-run>`
- `pintora-harness brief-run --run artifacts/agent-runs/<run-id> --out artifacts/agent-runs/<run-id>/repair-brief.md`

---

## Artifacts

### Render & Inspect

- `render.svg`
- `metrics.json`
- `findings.json`

### Browser Capture

- `browser.png`
- `dom.html`

### Summary

- `summary.json`

`summary.json` is the machine-readable rollup of the artifact directory. It includes the run id, case metadata placeholders, status, next action, score block, top findings, and judge inputs. The command does not recompute diagram rules; it only reads the existing artifacts and packages them into the summary file.

### Review

- `review.json`
- `review-pack/payload.json`
- `review-pack/README.md` for `manual-review-pack`

`review-case` is downstream-only. It requires an existing `summary.json`, copies the summary decision context into a normalized review payload, invokes the selected adapter, and writes `review.json`. It does not re-render, re-capture, or re-summarize artifacts.

Adapters may optionally include a `recommended_action` in `review.json`:

```json
{
  "recommended_action": {
    "type": "repair",
    "reason": "text overlaps relationship edge labels",
    "target": "diagram_source"
  }
}
```

### Review Decision

- `review-decision.json`

`apply-review` consumes `summary.json` + `review.json` and emits `review-decision.json`. It does not modify either source file. The decision file is the stable orchestration input that tells the pipeline what to do next.

Example `review-decision.json`:

```json
{
  "status": "completed",
  "review_status": "consumed",
  "source": {
    "summary": "summary.json",
    "review": "review.json"
  },
  "next_step": {
    "type": "repair",
    "reason": "text overlaps relationship edge labels",
    "target": "diagram_source"
  }
}
```

**Decision mapping rules:**

| Source in `review.json`             | `next_step.type` in `review-decision.json` |
| ----------------------------------- | ------------------------------------------ |
| `verdict: accept`                   | `accept`                                   |
| `verdict: reject`                   | `repair`                                   |
| `verdict: needs_human_review`       | `escalate`                                 |
| `verdict: inconclusive`             | `escalate`                                 |
| `recommended_action.type: accept`   | `accept`                                   |
| `recommended_action.type: reject`   | `repair`                                   |
| `recommended_action.type: repair`   | `repair`                                   |
| `recommended_action.type: rerun`    | `rerun`                                    |
| `recommended_action.type: escalate` | `escalate`                                 |

`recommended_action` takes priority over `verdict` when present.

### Agent Trace

- `manifest.json`
- `task.md`
- `env.json`
- `git-before.diff`
- `git-after.diff`
- `commands.ndjson`
- `decisions.ndjson`
- `analysis.md`
- `harness/suite.json`

`trace-run` records a local evidence bundle for one agent verification cycle.
`trace-agent-event` appends bounded process evidence to that trace bundle.
`summarize-agent-run` writes a human-readable activity summary and constraint gap report.
`analyze-runs` aggregates many trace bundles into an observability report.
`compare-runs` compares two trace bundles and reports improved, regressed, unchanged, missing, finding changes, command changes, and prediction results.
`brief-run` turns one trace bundle into a human-readable repair brief.

### Agent Activity

- `agent-events.ndjson`
- `constraints.json`
- `agent-summary.md`
- `constraint-gaps.md`

`trace-run` initializes these files. `trace-agent-event` appends bounded process evidence, and `summarize-agent-run` turns those events into a human-readable activity summary and constraint gap report.

---

## Pipeline Flow

```text
run-case
  ├── render-svg
  ├── inspect-svg
  ├── summarize-case → summary.json
  └── capture-browser (when next_action = capture_browser)
       └── summarize-case → summary.json (updated)

review-case (manual step)
  └── review.json

apply-review
  ├── reads summary.json
  ├── reads review.json
  └── writes review-decision.json
```

`run-case` does not automatically consume `review.json`. After review completes, `apply-review` is the explicit handoff step that produces the orchestration decision.

---

## Orchestration

### run-case

Executes `render-svg -> inspect-svg -> summarize-case` and automatically upgrades to `capture-browser` when `summary.next_action` is `capture_browser`, unless `--no-capture-browser` is passed.

### run-suite

Runs a predefined suite of registry cases and writes `suite.json` at the suite root.

`run-suite` reads `review-decision.json` from each case directory and aggregates review counts:

```json
{
  "suite": "smoke",
  "total": 10,
  "ok": 6,
  "suspicious": 2,
  "fail": 0,
  "captureBrowserTriggeredCount": 1,
  "accepted": 2,
  "needsRepair": 1,
  "needsRerun": 0,
  "escalated": 1,
  "reviewPending": 0,
  "cases": [...]
}
```

- `reviewPending` counts non-ok cases that have no `review-decision.json` yet.
- The suite layer is purely an aggregation layer; it does not re-interpret case findings.

---

## Exit codes

- `0`: ok
- `10`: suspicious
- `20`: fail
