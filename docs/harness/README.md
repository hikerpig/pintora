# Harness CLI

## Commands

- `pintora-harness render-svg --case er.relationship-spacing-01 --out artifacts/harness/dev/render.svg`
- `pintora-harness inspect-svg --in artifacts/harness/dev/render.svg --case er.relationship-spacing-01 --out-dir artifacts/harness/dev`

## Artifacts

- `render.svg`
- `metrics.json`
- `findings.json`

## Browser Capture

- `pintora-harness capture-browser --case er.relationship-spacing-01 --out-dir artifacts/harness/dev`
- `pintora-harness capture-browser --input ./tmp/case.pintora --out-dir artifacts/harness/dev --base-url http://localhost:3001/demo/preview/ --viewport 1440x960`

Outputs:

- `browser.png`
- `dom.html`

## Summary

- `pintora-harness summarize-case --artifacts artifacts/harness/dev --out artifacts/harness/dev/summary.json`

Outputs:

- `summary.json`

`summary.json` is the machine-readable rollup of the artifact directory. It includes the run id, case metadata placeholders, status, next action, score block, top findings, and judge inputs. The command does not recompute diagram rules; it only reads the existing artifacts and packages them into the summary file.

## Orchestration

- `pintora-harness run-case --case er.relationship-spacing-01 --artifacts-dir artifacts/harness/dev/er.relationship-spacing-01`
- `pintora-harness run-suite --suite smoke --artifacts-dir artifacts/harness/smoke-run`

`run-case` executes `render-svg -> inspect-svg -> summarize-case` and automatically upgrades to `capture-browser` when `summary.next_action` is `capture_browser`, unless `--no-capture-browser` is passed.

`run-suite` runs a predefined suite of registry cases and writes `suite.json` at the suite root.

## Exit codes

- `0`: ok
- `10`: suspicious
- `20`: fail
