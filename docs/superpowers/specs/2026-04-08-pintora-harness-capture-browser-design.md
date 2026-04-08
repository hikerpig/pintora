# Pintora Harness Capture Browser Design

## Status

This document defines the Phase 2 design for adding `capture-browser` to the Pintora harness. Phase 1 already provides `render-svg`, `inspect-svg`, the case registry, and machine-readable artifacts for structural inspection. Phase 2 adds stable browser evidence capture for cases that need stronger review signals.

This design intentionally keeps the command surface inside `@pintora/cli` for now, while isolating the implementation so it can be moved out later with minimal churn.

## Goal

Add a `harness capture-browser` command that:

- opens the existing preview page on an already-running local preview server
- renders the selected case or input through the preview surface with stable screenshot conditions
- captures diagram evidence as `browser.png`
- captures page DOM as `dom.html`
- emits machine-readable JSON on stdout for agent consumption

## Non-goals

This phase does not aim to:

- manage the lifecycle of the preview server
- decide whether a layout is good or bad
- perform screenshot diffing
- integrate a visual model judge
- add `summary.json` assembly yet

## Constraints Confirmed

The following constraints are locked in:

- the preview server is assumed to already be running
- the default preview URL is `http://localhost:3001/demo/preview/`
- the command supports an override via `--base-url`
- the command lives under the existing `@pintora/cli` harness command group for now
- the default outputs are both `browser.png` and `dom.html`
- long-term extraction from `@pintora/cli` is expected, so implementation boundaries should stay portable

## Recommended Command Shape

### Command

```bash
pintora harness capture-browser \
  --case er.relationship-spacing-01 \
  --out-dir artifacts/harness/<run-id> \
  [--base-url http://localhost:3001/demo/preview/] \
  [--viewport 1440x960]
```

### Inputs

- `--case <id>` or `--input <file>`
- `--out-dir <dir>`
- `--base-url <url>` optional
- `--viewport <WxH>` optional

### Outputs

- `browser.png`
- `dom.html`

### Stdout

```json
{"status":"ok","artifacts":["browser.png","dom.html"],"renderer":"svg-preview"}
```

### Exit Codes

- `0`: capture completed successfully
- `1`: command failure, preview unavailable, container missing, or capture failure

Phase 2 does not introduce `10` or `20` for this command. Suspicion and failure semantics remain the responsibility of the inspect/summarize layers.

## Placement

Phase 2 should continue to use the existing `@pintora/cli` harness surface, but browser-specific logic should be isolated into dedicated modules.

### Recommended files

- `packages/pintora-cli/src/harness/capture-browser.ts`
- `packages/pintora-cli/src/harness/browser-preview-url.ts`
- `packages/pintora-cli/src/harness/browser-capture.ts`
- `packages/pintora-cli/src/harness/browser-contracts.ts`

### Responsibility split

#### `capture-browser.ts`

Command orchestration only:

- resolve case versus raw input
- choose output paths
- call the URL builder
- call the browser driver
- write stdout JSON

#### `browser-preview-url.ts`

Pure URL construction:

- encode Pintora input into the preview URL
- force `renderer=svg`
- force `e2e=true`
- append optional encoded config later if needed
- honor `--base-url`

This file should remain browser-runtime-free so it is trivial to unit test and trivial to move to a future package.

#### `browser-capture.ts`

Browser automation only:

- open the preview URL
- wait for stable render conditions
- capture the diagram container
- serialize DOM

#### `browser-contracts.ts`

Shared browser capture defaults and types:

- default base URL
- default viewport
- artifact names
- capture result shape

## Stability Rules

The capture command should optimize for reproducible evidence, not for maximum flexibility.

### Fixed defaults

- `renderer=svg`
- `e2e=true`
- default `baseUrl=http://localhost:3001/demo/preview/`
- default viewport `1440x960`
- default device scale factor `1`
- fixed light background
- capture the diagram container only

### Why these defaults matter

- `renderer=svg` avoids renderer drift between browser sessions
- `e2e=true` reuses the preview page's existing font-loading path
- a fixed viewport and DPR keep image output stable across machines
- container-only capture reduces noise from page chrome and layout margins

## Wait Strategy

The capture command should not take the first possible screenshot. It should wait for a stable render state.

### Required wait sequence

1. Navigate to the preview URL and wait for the preview root container to exist
2. Wait for `document.fonts.ready`
3. Explicitly check the target font load path already used by preview e2e logic
4. Wait for the diagram container to contain an `svg`
5. Read the container bounds twice and require the same size in consecutive samples before capture

### Rationale

- font readiness prevents text reflow between initial paint and screenshot
- requiring the `svg` node prevents blank-container screenshots
- double-reading the bounds protects against catching the layout mid-settle

## Failure Semantics

Phase 2 should keep failure reporting mechanical and narrow.

### Command failures

Return exit code `1` when:

- the preview URL cannot be opened
- the preview container does not appear
- the `svg` node never appears
- screenshot writing fails
- DOM export fails

### Non-failures

The command should still return success when:

- the screenshot reveals an awkward layout
- the DOM contains suspicious geometry
- a later layer might decide the result is suspicious

Those conditions belong to `inspect-svg` or later `summary.json`, not to `capture-browser`.

## Reuse of Existing Foundations

Phase 2 should explicitly reuse existing repository behavior instead of inventing a second preview surface.

### Preview page

`demo/src/pages/preview/main.tsx` already:

- reads code from URL params
- reads renderer from URL params
- has an `e2e=true` path that waits for font readiness

Phase 2 should build on that path directly.

### Existing e2e helper

`demo/cypress/e2e/test-utils/render.ts` already demonstrates:

- URL encoding through `encodeForUrl`
- navigation to `/demo/preview/`
- `e2e=true` usage

Phase 2 should follow the same URL semantics so future debugging can compare harness capture with Cypress capture without translation.

## Testing Strategy

Phase 2 should use a three-layer test strategy.

### 1. URL builder unit tests

Recommended file:

- `packages/pintora-cli/src/__tests__/harness/browser-preview-url.spec.ts`

These tests should verify:

- default base URL
- explicit `--base-url`
- encoded code param for `--input`
- `renderer=svg`
- `e2e=true`

### 2. Capture orchestration unit tests

Recommended file:

- `packages/pintora-cli/src/__tests__/harness/capture-browser.spec.ts`

These tests should mock the browser driver and verify:

- `browser.png` and `dom.html` paths are written under `--out-dir`
- default viewport is applied
- structured stdout result shape is correct

### 3. Manual or conditional integration smoke

Recommended first target:

- one ER registry case

The smoke path should verify:

- preview server already running
- `capture-browser` writes `browser.png`
- `capture-browser` writes `dom.html`
- command returns exit code `0`

This integration test should not be required as a universal CI dependency in the first iteration.

## Proposed Minimal Implementation Slice

Phase 2 should be implemented in four steps.

### Step 1

Add the `harness capture-browser` CLI command and contracts.

### Step 2

Implement preview URL construction with stable defaults.

### Step 3

Implement browser capture with:

- preview navigation
- font readiness wait
- stable bounds wait
- container screenshot
- DOM serialization

### Step 4

Add unit tests and update `docs/harness/README.md` with command usage.

## Migration Friendliness

Because this feature is expected to move out of `@pintora/cli` later, Phase 2 should preserve these boundaries:

- no browser implementation logic in `cli.ts`
- no direct filesystem path shaping inside the browser driver
- no case registry logic inside the browser driver
- no judgment logic inside capture

If those boundaries hold, later extraction should be mostly:

- move browser modules to a new package
- re-export the same command behavior from a new entrypoint
- leave URL semantics and artifact contracts unchanged

## Decision Summary

Recommended direction:

- keep the command temporarily in `@pintora/cli`
- isolate browser behavior into dedicated modules
- assume preview server is already running
- default to `http://localhost:3001/demo/preview/` with `--base-url` override
- always emit both `browser.png` and `dom.html`
- optimize for stability and evidence capture, not for judgment
