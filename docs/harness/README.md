# Harness Phase 1

## Commands

- `pintora harness render-svg --case er.relationship-spacing-01 --out artifacts/harness/dev/render.svg`
- `pintora harness inspect-svg --in artifacts/harness/dev/render.svg --case er.relationship-spacing-01 --out-dir artifacts/harness/dev`

## Artifacts

- `render.svg`
- `metrics.json`
- `findings.json`

## Exit codes

- `0`: ok
- `10`: suspicious
- `20`: fail
