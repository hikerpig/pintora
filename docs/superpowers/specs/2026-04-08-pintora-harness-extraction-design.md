# Pintora Harness Extraction Design

## Status

This document defines the next phase of the Pintora harness work: fully extracting the harness runtime and commands out of `@pintora/cli` into a dedicated internal package.

Phase 1 established `render-svg` and `inspect-svg`. Phase 2 added `capture-browser`. Phase 3 added `summarize-case` and `summary.json`. Those phases intentionally lived inside `@pintora/cli` to move quickly. That temporary boundary is now removed.

This phase makes the harness a standalone internal toolchain with its own package and CLI.

## Goal

Create a new internal package `@pintora/harness` that:

- owns all harness runtime logic
- owns all harness command implementations
- exposes its own internal development CLI `pintora-harness`
- removes all harness awareness from `@pintora/cli`

After this phase:

- `@pintora/cli` should only provide the general Pintora rendering CLI
- `@pintora/harness` should provide the harness CLI and runtime
- the old `pintora harness ...` command surface should no longer exist

## Non-goals

This phase does not aim to:

- publish `@pintora/harness` as a public npm package yet
- add new harness capabilities beyond migration
- add visual judge integration
- add run-suite or batch orchestration
- redesign the summary schema
- fix unrelated workspace-wide ESM packaging issues

## Constraints Confirmed

The following constraints are locked in:

- `@pintora/cli` must become completely unaware of harness
- the harness must have its own internal CLI
- the old harness commands must be removed from `@pintora/cli`, not deprecated in place
- the extraction should preserve current command behavior and output formats as closely as possible
- the new package is internal-first; public package hardening is out of scope for this phase

## Recommended Command Shape

### New commands

```bash
pintora-harness render-svg --case er.relationship-spacing-01 --out artifacts/harness/dev/render.svg
pintora-harness inspect-svg --in artifacts/harness/dev/render.svg --case er.relationship-spacing-01 --out-dir artifacts/harness/dev
pintora-harness capture-browser --case er.relationship-spacing-01 --out-dir artifacts/harness/dev
pintora-harness summarize-case --artifacts artifacts/harness/dev --out artifacts/harness/dev/summary.json
```

### Removed commands

These should be deleted from `@pintora/cli`:

```bash
pintora harness render-svg ...
pintora harness inspect-svg ...
pintora harness capture-browser ...
pintora harness summarize-case ...
```

### Compatibility posture

This phase is a deliberate command-surface break inside the repo. The old command group should be removed rather than shimmed.

## Package Placement

The recommended location is:

- `packages/pintora-harness`

This package should be a normal workspace package with:

- `src/` for runtime and CLI sources
- `lib/` build output
- its own `package.json`
- its own `tsconfig.json`
- its own test target

## Package Responsibilities

`@pintora/harness` should own:

- case registry loading
- harness input resolution
- svg rendering orchestration
- svg inspection orchestration
- browser capture orchestration
- summary assembly orchestration
- harness contracts and result types
- artifact reading
- harness rules
- harness CLI argument parsing and stdout behavior

`@pintora/cli` should retain only:

- the existing general-purpose `render` command
- generic render/runtime helpers that are truly CLI-scoped

If code exists only to support harness behavior, it should move or be deleted.

## Recommended Source Layout

A recommended layout for `packages/pintora-harness/src/` is:

- `cli.ts`
- `index.ts`
- `contracts/harness.ts`
- `contracts/browser.ts`
- `contracts/summary.ts`
- `cases/case-registry.ts`
- `cases/read-input.ts`
- `rendering/render-svg.ts`
- `inspection/inspect-svg.ts`
- `inspection/svg-parse.ts`
- `inspection/svg-metrics.ts`
- `inspection/findings.ts`
- `inspection/rules/er-rules.ts`
- `inspection/rules/sequence-rules.ts`
- `browser/capture-browser.ts`
- `browser/browser-preview-url.ts`
- `browser/browser-capture.ts`
- `summary/artifact-reader.ts`
- `summary/summary-rules.ts`
- `summary/summarize-case.ts`
- `exit-codes.ts`

This layout is not valuable because it is different from the current one. It is valuable because it separates input resolution, rendering, inspection, browser capture, and summary assembly into stable subdomains.

## Dependency Rules

The new package must not depend on `@pintora/cli`.

That is the most important architectural rule in this phase.

### Allowed dependencies

`@pintora/harness` may depend on:

- the Pintora runtime packages it actually needs
- `playwright`
- `jsdom`
- Node built-ins
- other direct runtime dependencies already used by the harness implementation

### Forbidden dependency

`@pintora/harness` must not import from:

- `packages/pintora-cli/src/*`
- `@pintora/cli`

If a harness implementation currently reuses `@pintora/cli` helpers, those helpers must either:

- move into `@pintora/harness`, or
- move into a lower reusable package, or
- remain duplicated temporarily only if the duplication is smaller and safer than introducing a wrong dependency edge

The wrong dependency graph is worse than a small amount of duplication.

## Render Adapter Strategy

The most migration-sensitive area is `render-svg`.

Today the harness render path reuses the CLI render stack. Once harness is extracted, this coupling becomes invalid.

The recommended strategy is:

- give `@pintora/harness` its own thin render adapter
- keep that adapter focused only on what harness actually needs
- avoid pulling the whole CLI runtime in as an abstraction dependency

This adapter can initially be simple and internal. It does not need to become a shared universal render package in this phase.

## Migration Strategy

This phase is a full extraction, but it should still be implemented in controlled steps.

### Step 1: Create the new package

Add `packages/pintora-harness` with:

- package metadata
- compile target
- CLI bin entry
- minimal exports

### Step 2: Move runtime modules

Move or recreate the harness implementation modules in the new package.

The target is behavioral equivalence, not a refactor for its own sake.

### Step 3: Move tests

Move harness-focused tests out of `packages/pintora-cli/src/__tests__/harness/` into the new package.

### Step 4: Wire the new CLI

Add `pintora-harness` command registration inside the new package and verify its stdout and exit code behavior matches the previous harness command group.

### Step 5: Remove old CLI integration

Delete from `@pintora/cli`:

- harness command definitions
- harness imports
- harness runtime files
- harness tests
- harness documentation that points to `pintora harness ...`

### Step 6: Re-verify behavior

Run focused regression checks on:

- `render-svg`
- `inspect-svg`
- `capture-browser`
- `summarize-case`
- summary/status exit codes

## Artifact and Case Asset Ownership

The harness also needs stable access to case assets and registry data.

The recommended ownership is:

- `harness/cases/` remains a repo-level asset directory for now, unless there is a strong reason to package it differently
- `@pintora/harness` becomes the code owner for reading those assets

This phase does not need to re-home the asset files into the package if that complicates the migration. Code ownership matters more than file relocation in the first extraction.

## Testing Strategy

This phase should verify both migration correctness and command-surface removal.

### Package-level tests

Move and keep the existing harness tests, adapted to the new package layout:

- render-svg tests
- inspect-svg tests
- capture-browser tests
- summary tests
- registry/input tests
- end-to-end harness tests

### CLI smoke tests

Add direct smoke tests or manual verification for:

```bash
node packages/pintora-harness/lib/cli.js render-svg ...
node packages/pintora-harness/lib/cli.js inspect-svg ...
node packages/pintora-harness/lib/cli.js capture-browser ...
node packages/pintora-harness/lib/cli.js summarize-case ...
```

### Removal verification

Add coverage that ensures `@pintora/cli` no longer exposes the harness command group.

A clean failure or missing-command help output is acceptable and expected.

## Exit Code Continuity

The extracted CLI should preserve existing harness exit code semantics:

- `0`: ok
- `10`: suspicious
- `20`: fail
- `1`: command or runtime failure

This should remain stable across the migration so downstream agent logic does not change.

## Documentation Updates

This phase should update docs to reflect the new ownership model.

At minimum:

- harness docs should reference `pintora-harness`, not `pintora harness`
- package-level docs should explain that harness is now separate from `@pintora/cli`
- any stale examples under `docs/harness/README.md` should be updated or removed

## Risks

### Render coupling risk

Harness rendering currently depends on implementation details that lived comfortably inside `@pintora/cli`. Extraction may reveal hidden dependencies on CLI-local render helpers.

### Test relocation risk

Existing tests may assume CLI-local relative paths and need careful rewiring.

### Asset location risk

Case registry and seed case loading currently assume repo-relative resolution. Those assumptions must remain stable after extraction.

### Scope creep risk

It will be tempting to redesign packaging, public exports, batch orchestration, and judge integration during extraction. Those should all be resisted in this phase.

## Success Criteria

This phase is successful when all of the following are true:

- `packages/pintora-harness` exists and builds
- `pintora-harness` provides the four current commands
- current harness tests pass under the new package
- direct CLI smoke works through `packages/pintora-harness/lib/cli.js`
- `@pintora/cli` no longer contains harness commands or harness runtime modules
- existing harness behavior and exit codes remain materially unchanged
