# @pintora/harness

**Role:** Internal observability harness for rendering diagram cases, collecting SVG/browser evidence, summarizing findings, and aggregating agent run outcomes.

## Entry Points

- `src/index.ts` — public exports for harness APIs.
- `src/cli.ts` — CLI command wiring for `pintora-harness`.
- `bin/pintora-harness` — executable wrapper.

## Internal Layout

| Path | Responsibility |
|------|----------------|
| `src/cases/` | Locate and read case registry entries from repo-root `harness/cases/`. |
| `src/rendering/` | Render Pintora input to SVG. |
| `src/inspection/` | Parse SVG, collect metrics, and emit structural findings. |
| `src/browser/` | Capture browser screenshots and DOM artifacts. |
| `src/summary/` | Roll case artifacts into `summary.json`. |
| `src/orchestration/` | Run cases and suites. |
| `src/review/` | Build review payloads and consume review decisions. |
| `src/analysis/` | Analyze trace runs and produce observability reports. |
| `src/trace/` | Record command, git, environment, and manifest evidence for agent runs. |
| `src/__tests__/` | Jest unit and integration tests. |

## Case Assets

- Harness case source files live at repo root under `harness/cases/`, not inside `packages/pintora-harness`.
- `harness/cases/registry.json` is required by registry-backed commands and tests.
- Do not delete or move case files without updating `src/cases/case-registry.ts`, tests, README usage examples, and `.ai/specs/pintora-harness-design.md`.

## Findings Triage

- `summary.json.suspected_component` is a hint, not proof. Verify the raw `metrics.json`, `findings.json`, and rendered SVG before editing a diagram package.
- For SVG edge-clearance findings, confirm that metrics use effective SVG coordinates after applying ancestor and node `transform` attributes.
- If unit tests fail, treat observability reports as incomplete. Do not interpret missing hotspots as a successful diagram repair.
- `artifacts/` contains generated evidence. Do not treat artifacts as source-of-truth case definitions.

## Tested How

- Package tests: `pnpm --filter @pintora/harness test -- --runInBand`
- Compile: `pnpm --filter @pintora/harness compile`
- Smoke suite after harness or diagram-risk changes: `pintora-harness run-suite --suite smoke --artifacts-dir artifacts/harness/smoke-run`

## Gotchas

- `run-suite` returns exit code `10` for suspicious results; this is a completed run, not a command crash.
- `review-case` and `apply-review` are downstream steps. They should not re-render or mutate source artifacts.
- Snapshot updates are not part of normal harness triage.
