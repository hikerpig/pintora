# Pintora Agent Activity Trace Design

## Status

Draft for review.

This document specifies how to extend Pintora's local harness observability
from verification artifacts into bounded, structured evidence about a coding
agent's development process. It complements the existing agent observability
harness design rather than replacing it.

The first version deliberately avoids trying to capture a full raw model
transcript. Instead, it records agent-declared process events, constraint
checks, edit intent, verification reactions, and course corrections in local
artifact files that are safe for humans and future agents to inspect.

## Relationship to Existing Harness Trace

The current trace layer answers verification questions:

- What task was being verified?
- What git state and diffs existed before and after the run?
- Which commands ran, and what were their outcomes?
- Which harness cases were ok, suspicious, failed, improved, or regressed?
- Which predictions were confirmed or disconfirmed by case status changes?

This design adds a process layer that answers activity and constraint
engineering questions:

- Which project constraints did the agent identify as relevant?
- Did the agent read the required `AGENTS.md`, specs, skills, and docs before
  editing?
- Did the plan match the files edited and commands run?
- Where did the agent correct course after tool or test feedback?
- Which constraint misses correlate with failed or suspicious verification
  outcomes?
- Which repository instructions are too vague, missing, noisy, or frequently
  ignored?

Both layers share the same `run_id` and live under the same trace directory.

## Goals

1. Add a bounded activity event stream for one coding-agent development run.
2. Represent project constraints as first-class local artifacts.
3. Record whether constraints were observed, missed, conflicted, inapplicable,
   or unknown.
4. Generate human-readable summaries of agent activity and constraint gaps.
5. Aggregate activity traces across runs to guide AI constraint engineering.
6. Preserve the current local-first, artifact-first architecture.
7. Avoid dependency on a specific LLM vendor transcript or tracing SDK.

## Non-Goals

- No full raw conversation capture in version one.
- No hidden capture of private prompts, arbitrary environment variables, API
  keys, or unbounded stdout/stderr.
- No automatic judging of agent quality from private chain-of-thought.
- No automatic source-code edits from activity analysis.
- No hosted telemetry service.
- No replacement for compile, Jest, harness cases, review decisions, or
  `compare-runs`.
- No requirement that every tiny edit produce perfect activity telemetry.

## Design Principle

Record agent-explainable evidence, not everything the agent saw.

The useful unit for repository-level AI constraint engineering is not the
complete transcript. It is a structured claim about what happened, tied to
bounded evidence:

- a context file was read;
- a constraint was observed or missed;
- a plan predicted a specific edit path;
- a verification failure caused a concrete course correction;
- a gap in project instructions was discovered.

This keeps the trace compact, reviewable, and less sensitive while still
allowing cross-run analysis.

## Trace Directory Extensions

Each trace directory may include these additional files:

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
  analysis.md

  agent-events.ndjson
  constraints.json
  agent-summary.md
  constraint-gaps.md
```

`trace-run` should initialize empty or minimal versions of these files so a
run directory has a stable shape even before activity events are recorded.

Files may be absent in older traces. Analysis commands must treat missing
activity files as incomplete activity evidence, not as a failed verification
run.

## Agent Event Schema

`agent-events.ndjson` stores one JSON object per line.

Common fields:

```json
{
  "schema_version": 1,
  "ts": "2026-05-18T10:00:00.000Z",
  "kind": "constraint_check",
  "phase": "context",
  "summary": "Read package AGENTS.md before editing harness package.",
  "data": {
    "constraint_id": "package-agents-before-edit",
    "status": "observed",
    "evidence_refs": ["packages/pintora-harness/AGENTS.md"]
  }
}
```

Required fields:

- `schema_version`
- `ts`
- `kind`
- `phase`
- `summary`
- `data`

`summary` must be a bounded human-readable sentence or short paragraph. It
must not contain full prompt transcripts or large command output.

## Event Kinds

Version one supports these event kinds:

| Kind                | Purpose                                                |
| ------------------- | ------------------------------------------------------ |
| `context_read`      | The agent read relevant project context.               |
| `agent_plan`        | The agent stated a plan or changed its plan.           |
| `constraint_check`  | The agent checked a project constraint.                |
| `edit_intent`       | The agent described an intended edit before making it. |
| `edit_result`       | The agent summarized actual edited files or behavior.  |
| `verification`      | The agent recorded a verification action or result.    |
| `course_correction` | The agent changed direction after evidence.            |
| `open_question`     | The agent identified a human decision point.           |
| `final_summary`     | The agent summarized the run outcome.                  |

The schema should tolerate unknown future `kind` values by preserving them in
raw event output and excluding them from typed aggregate metrics.

## Phases

Version one supports these phases:

```text
context
planning
implementation
verification
review
handoff
```

The phase is intentionally coarse. It is used for analysis and readability,
not for enforcing a workflow.

## Constraint Schema

`constraints.json` stores constraints that were relevant to the run.

```json
{
  "schema_version": 1,
  "constraints": [
    {
      "id": "package-agents-before-edit",
      "source": "AGENTS.md",
      "source_ref": "AGENTS.md",
      "text": "Before editing inside a package, read its AGENTS.md.",
      "scope": ["packages/*"],
      "severity": "must"
    },
    {
      "id": "pnpm-only",
      "source": "AGENTS.md",
      "source_ref": "AGENTS.md",
      "text": "pnpm only. Do not introduce npm or yarn lockfiles.",
      "scope": ["repo"],
      "severity": "must"
    }
  ]
}
```

Required constraint fields:

- `id`
- `source`
- `text`
- `scope`
- `severity`

Optional fields:

- `source_ref`
- `notes`

Allowed `severity` values:

```text
must
should
may
```

Version one does not need automatic extraction from every instruction file.
The agent can write constraints that were relevant to the current task. Later
versions can infer candidate constraints from `AGENTS.md`, package
`AGENTS.md`, skills, and design specs.

## Constraint Check Events

`constraint_check` events use this `data` shape:

```json
{
  "constraint_id": "package-agents-before-edit",
  "status": "observed",
  "evidence": "Read packages/pintora-harness/AGENTS.md before editing package files.",
  "evidence_refs": ["packages/pintora-harness/AGENTS.md"]
}
```

Allowed statuses:

```text
observed
missed
conflicted
not_applicable
unknown
```

Semantics:

- `observed`: evidence shows the constraint was followed.
- `missed`: evidence shows the constraint should have applied but was not
  followed.
- `conflicted`: two or more constraints pulled in incompatible directions.
- `not_applicable`: the constraint was checked and did not apply.
- `unknown`: the trace does not contain enough evidence to decide.

Constraint checks are evidence, not proof. They should cite files, commands,
diffs, summaries, or artifact paths when possible.

## Gap Reporting

`constraint-gaps.md` is a human-readable report generated from events and
constraints. It should focus on instruction-quality gaps, not blame.

Examples:

- No project rule says when an agent should run `compare-runs`.
- The package `AGENTS.md` mentions a smoke suite but not trace-run usage.
- The task required a design approval gate, but the relevant skill and user
  instruction conflicted.
- A command failed because setup prerequisites were implicit.

Each gap should include:

- a short title;
- evidence run or event references;
- affected constraint id when available;
- a suggested documentation or harness improvement.

## Agent Summary

`agent-summary.md` is a bounded narrative for humans and follow-up agents. It
should include:

1. task title and run id;
2. context files read;
3. constraints checked and their statuses;
4. plan summary;
5. files edited or intended edit areas;
6. verification results;
7. course corrections;
8. open questions;
9. recommended next step.

It should link to existing artifacts rather than quoting large content.

## CLI Additions

### `trace-agent-event`

Append one event to `agent-events.ndjson`.

```bash
node packages/pintora-harness/bin/pintora-harness trace-agent-event \
  --run artifacts/agent-runs/<run-id> \
  --kind constraint_check \
  --phase context \
  --summary "Read package AGENTS.md before editing harness package." \
  --data '{"constraint_id":"package-agents-before-edit","status":"observed","evidence_refs":["packages/pintora-harness/AGENTS.md"]}'
```

Responsibilities:

1. Validate `kind`, `phase`, and JSON `data`.
2. Add `schema_version: 1` and current `ts`.
3. Append one NDJSON line.
4. Preserve existing events.
5. Avoid writing outside the requested run directory.

### `summarize-agent-run`

Generate `agent-summary.md` and `constraint-gaps.md` for one run.

```bash
node packages/pintora-harness/bin/pintora-harness summarize-agent-run \
  --run artifacts/agent-runs/<run-id>
```

Responsibilities:

1. Read `manifest.json`, `agent-events.ndjson`, `constraints.json`,
   `commands.ndjson`, and harness summaries when present.
2. Group constraint checks by constraint id and status.
3. Extract course corrections and open questions.
4. Write a bounded Markdown summary.
5. Write a bounded Markdown gap report.

### `analyze-agent-runs`

Aggregate process evidence across run directories.

```bash
node packages/pintora-harness/bin/pintora-harness analyze-agent-runs \
  --runs artifacts/agent-runs \
  --out artifacts/harness/agent-observability-report.json
```

Responsibilities:

1. Discover trace run directories.
2. Read activity files when present.
3. Count missing activity files separately from incomplete verification runs.
4. Aggregate constraint observance by constraint id.
5. Aggregate frequent gap titles.
6. Aggregate course-correction patterns.
7. Correlate missed constraints with non-ok harness outcomes when both are
   available.
8. Emit JSON.

## Analysis Output

Target shape:

```json
{
  "schema_version": 1,
  "generated_at": "2026-05-18T10:30:00.000Z",
  "total_runs": 12,
  "runs_with_activity": 9,
  "runs_missing_activity": 3,
  "constraint_observance": [
    {
      "constraint_id": "package-agents-before-edit",
      "observed": 7,
      "missed": 1,
      "conflicted": 0,
      "not_applicable": 1,
      "unknown": 0
    }
  ],
  "frequent_gaps": [
    {
      "title": "No rule says when to run compare-runs",
      "count": 4,
      "evidence_runs": ["20260518-a", "20260518-b"]
    }
  ],
  "course_correction_patterns": [
    {
      "trigger": "compile failure",
      "count": 3,
      "common_next_action": "fix typing before harness"
    }
  ],
  "constraint_failure_correlation": [
    {
      "constraint_id": "package-agents-before-edit",
      "non_ok_harness_runs": 2,
      "sample_runs": ["20260518-c"]
    }
  ]
}
```

## Error Handling

- Missing activity files should not fail `analyze-agent-runs`.
- Malformed event lines should be skipped with warnings in the report.
- Invalid `trace-agent-event --data` JSON should fail before writing.
- Invalid `kind` or `phase` values should fail in version one unless
  `--allow-unknown-kind` is explicitly added in a later version.
- Summary generation should still write a file when only partial activity
  evidence exists.
- No command should delete prior activity files.

## Privacy and Data Hygiene

Allowed by default:

- short summaries;
- file paths and artifact refs;
- constraint ids and statuses;
- bounded evidence strings;
- command phase summaries;
- harness status references.

Not allowed by default:

- full conversation transcripts;
- private chain-of-thought;
- arbitrary environment variables;
- auth tokens or API keys;
- full stdout/stderr;
- unrelated user files.

If a future transcript importer is added, it must be opt-in, bounded, and able
to redact or summarize before writing repository artifacts.

## Integration with Existing Commands

`trace-run` should initialize activity files:

```text
agent-events.ndjson
constraints.json
agent-summary.md
constraint-gaps.md
```

The initialized `constraints.json` may contain an empty list:

```json
{
  "schema_version": 1,
  "constraints": []
}
```

`analyze-runs` should remain focused on verification evidence. The new
`analyze-agent-runs` command should own activity analysis.

`compare-runs` should remain focused on before/after verification comparison.
Future versions may link its regressions to activity events, but it should not
become the primary activity analyzer.

## Test Strategy

Unit tests:

- event validation for allowed kinds and phases;
- appending one event without truncating existing events;
- invalid JSON data fails without writing;
- constraint status aggregation;
- missing activity files counted safely;
- malformed NDJSON line skipped with warning;
- summary generation from fixture events;
- gap report generation from missed and conflicted constraints;
- correlation between missed constraints and non-ok harness outcomes.

Integration tests:

- CLI dispatch for `trace-agent-event`;
- CLI dispatch for `summarize-agent-run`;
- CLI dispatch for `analyze-agent-runs`;
- `trace-run` initializes activity files;
- `analyze-agent-runs` works on fixture trace directories without Playwright.

Manual checks:

```bash
node packages/pintora-harness/bin/pintora-harness trace-run \
  --task "manual activity trace smoke" \
  --suite smoke \
  --out artifacts/agent-runs \
  --no-capture-browser \
  --max-concurrency 1

node packages/pintora-harness/bin/pintora-harness trace-agent-event \
  --run artifacts/agent-runs/<run-id> \
  --kind constraint_check \
  --phase context \
  --summary "Read package AGENTS.md before editing harness package." \
  --data '{"constraint_id":"package-agents-before-edit","status":"observed"}'

node packages/pintora-harness/bin/pintora-harness summarize-agent-run \
  --run artifacts/agent-runs/<run-id>

node packages/pintora-harness/bin/pintora-harness analyze-agent-runs \
  --runs artifacts/agent-runs \
  --out artifacts/harness/agent-observability-report.json
```

## Rollout Plan

### P1: Activity Contracts and Initialization

Add event and constraint contracts. Make `trace-run` initialize activity files.

Acceptance:

- New trace directories contain `agent-events.ndjson`, `constraints.json`,
  `agent-summary.md`, and `constraint-gaps.md`.
- Older trace directories still analyze safely.
- Tests lock the allowed event kinds, phases, and constraint statuses.

### P2: `trace-agent-event`

Add the append-only event writer command.

Acceptance:

- One command appends one valid NDJSON event.
- Invalid JSON data does not modify the file.
- Existing events are preserved.

### P3: `summarize-agent-run`

Generate activity summary and constraint gap Markdown.

Acceptance:

- Summary includes context reads, plans, constraint checks, verifications,
  course corrections, open questions, and final summary when present.
- Gap report lists missed and conflicted constraints with evidence.
- Partial traces still produce useful summaries.

### P4: `analyze-agent-runs`

Aggregate activity traces across runs.

Acceptance:

- Report includes constraint observance counts.
- Missing activity files are counted separately.
- Frequent gaps and course-correction patterns are reported.
- Missed constraints can be correlated with non-ok harness outcomes.

### P5: Constraint Discovery Helpers

Add helpers that propose relevant constraints from `AGENTS.md`, package
`AGENTS.md`, and specs.

Acceptance:

- The helper proposes constraints but does not silently enforce them.
- Proposed constraints cite source files.
- Users and agents can edit or ignore proposals.

### P6: Optional Transcript Import

Only after structured activity traces are useful, add an importer for external
Codex/session exports if the environment exposes one.

Acceptance:

- Import is explicit and opt-in.
- Imported content is summarized or redacted before writing artifacts.
- The importer maps raw events into the same `agent-events.ndjson` schema.

## Open Decisions

1. Whether `trace-agent-event` should accept only JSON strings in `--data` or
   also support `--data-file`.
2. Whether `constraints.json` should be manually populated in version one or
   generated from a small built-in Pintora constraint catalog.
3. Whether summaries should include line references to constraint source files
   when available.
4. Whether activity analysis should remain a separate command permanently or
   later merge into the existing `analyze-runs` report.

## Recommended First Implementation Slice

Implement P1 through P3 first:

1. Add activity contracts.
2. Initialize activity files from `trace-run`.
3. Add `trace-agent-event`.
4. Add `summarize-agent-run`.
5. Add focused tests and README usage examples.

This slice is enough to start dogfooding agent activity traces in real Codex
development sessions without building a transcript importer or an automated
constraint optimizer.
