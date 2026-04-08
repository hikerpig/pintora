# Harness Phase 1

## Commands

- `pintora harness render-svg --case er.relationship-spacing-01 --out artifacts/harness/dev/render.svg`
- `pintora harness inspect-svg --in artifacts/harness/dev/render.svg --case er.relationship-spacing-01 --out-dir artifacts/harness/dev`

## Artifacts

- `render.svg`
- `metrics.json`
- `findings.json`

## Browser Capture

- `pintora harness capture-browser --case er.relationship-spacing-01 --out-dir artifacts/harness/dev`
- `pintora harness capture-browser --input ./tmp/case.pintora --out-dir artifacts/harness/dev --base-url http://localhost:3001/demo/preview/ --viewport 1440x960`

Outputs:

- `browser.png`
- `dom.html`

## Exit codes

- `0`: ok
- `10`: suspicious
- `20`: fail
