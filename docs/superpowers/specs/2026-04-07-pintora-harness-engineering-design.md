# Pintora Harness Engineering Design

## Status

This document defines the first-phase design for a local agent validation harness for Pintora. The goal is not to replace the existing test stack. The goal is to provide a stable, programmable, and handoff-friendly layout validation surface for AI coding loops.

This document covers:

- goals and non-goals
- external references
- recommended architecture and command boundaries
- rubric, artifact schema, and case registry
- the first-phase `er` / `sequence` rule set
- agent orchestration

## Background

Pintora already has several reusable building blocks:

- the CLI can produce `svg` / `png` / `txt`
  - see `packages/pintora-cli/src/render-impl.ts`
- the demo preview page can render diagrams from URL parameters
  - see `demo/src/pages/preview/main.tsx`
- there is already a browser-side e2e render entry
  - see `demo/cypress/e2e/test-utils/render.ts`

What is missing is an agent-facing harness layer that turns those capabilities into:

- scriptable commands
- machine-consumable structured output
- browser evidence for review
- run artifacts that can be handed to the next agent iteration

## Goals

First-phase goals:

1. Let AI validate whether a layout has obvious issues by running `svg`-based structural checks after code changes
2. Add browser screenshots automatically for suspicious cases as stronger evidence
3. Produce structured reports that external agents can use for replanning, self-review, and repair suggestions
4. Focus on `er` and `sequence` first, with high-precision rules
5. Keep the judge external for now, while reserving interface hooks for future visual-model integration

## Non-goals

The first phase does not aim to:

- auto-edit code and close the loop all the way to a committed fix
- cover every diagram type from day one
- treat screenshot diffing as the only source of truth
- bind the harness to one model vendor
- replace the existing Jest / Cypress / snapshot test stack

## External References

This design explicitly references two articles and only adopts the parts that are directly useful for Pintora's current goal.

### OpenAI: Harness engineering

Source:

- https://openai.com/index/harness-engineering/

Borrowed ideas:

- the harness should improve the agent's execution environment and feedback loops instead of relying on longer prompts alone
- the application should become something agents can start, navigate, inspect, and reason about
- repository documentation and structured indexes should become the system of record instead of burying rules inside conversational context
- agents should start from a small, stable entry point and progressively discover more detailed knowledge

Applied to Pintora:

- reuse the existing CLI and preview page as stable command surfaces
- introduce a `case registry` and `rubric.md`
- output structured artifacts rather than relying on session memory

### Anthropic: Harness design for long-running application development

Source:

- https://www.anthropic.com/engineering/harness-design-long-running-apps

Borrowed ideas:

- generation and evaluation should be logically separated
- the evaluator should be triggered when the task is near the model's reliability boundary, not always on every run
- structured handoff artifacts matter for long-running or multi-round workflows
- load-bearing harness components should be identified iteratively and kept minimal

Applied to Pintora:

- run `inspect-svg` first, then trigger browser capture only when needed
- always materialize `summary.json`, `findings.json`, screenshots, and render outputs
- scope the first phase to `er` and `sequence`

## Design Principles

1. Structure first, visuals second
   - use `svg` structural signals to catch obvious and suspicious failures before escalating to browser evidence
2. Precision over recall
   - first-phase rules should avoid noisy false positives
3. Small and stable commands
   - orchestration belongs to the external agent, not to one monolithic harness runner
4. Handoff-ready artifacts
   - any later agent iteration should be able to continue from saved outputs alone
5. Knowledge lives in the repo
   - rubric, case metadata, and rule boundaries should be written down in the repository

## Recommended Architecture

The harness should live outside runtime product packages and use a four-layer structure.

### Layer 1: Render Adapters

Responsibility: render a single input into normalized outputs.

First-phase adapters:

- `cli-svg`
- `cli-png`
- `browser-preview`

Reused foundations:

- `packages/pintora-cli/src/render-impl.ts`
- `demo/src/pages/preview/main.tsx`

### Layer 2: Inspectors

Responsibility: compute objective checks only, without subjective judgment.

First-phase inspectors:

- `svg-structure-inspector`
- `case-rule-inspector`

Expected checks:

- viewBox versus content bounds
- text bbox versus borders and line segments
- overlap and local crowding
- connector endpoint and marker placement
- diagram-specific constraints

### Layer 3: Capture

Responsibility: when structural checks return `suspicious` or `fail`, capture browser evidence from the real preview surface.

First-phase capture includes:

- start the preview page
- wait for font stability
- capture the diagram container
- optionally save DOM / SVG outerHTML

### Layer 4: Report Assembly

Responsibility: combine render, inspect, and capture outputs into a standard report that an external agent can consume.

Important constraints:

- no built-in model judge in phase one
- output machine-readable summaries only
- reserve schema fields for future judge adapters

## Command Boundaries

The first phase should only introduce five primitives.

### `harness render-svg`

Inputs:

- `--case <id>` or `--input <file>`
- `--out <file>`

Outputs:

- `render.svg`

stdout example:

```json
{"status":"ok","diagramType":"er","artifact":"render.svg"}
```

### `harness render-png`

Inputs:

- `--case <id>` or `--input <file>`
- `--out <file>`

Outputs:

- `render.png`

### `harness inspect-svg`

Inputs:

- `--in <svg>`
- `--case <id>` optional, for loading diagram-specific rules
- `--out-dir <dir>`

Outputs:

- `metrics.json`
- `findings.json`

stdout example:

```json
{"status":"suspicious","findingCount":2,"artifacts":["metrics.json","findings.json"]}
```

### `harness capture-browser`

Inputs:

- `--case <id>` or `--input <file>`
- `--out <file>`
- `--viewport <WxH>` optional

Outputs:

- `browser.png`
- optional `dom.html`

stdout example:

```json
{"status":"ok","artifact":"browser.png","renderer":"svg-preview"}
```

### `harness summarize-case`

Inputs:

- `--artifacts <dir>`
- `--out <file>`

Outputs:

- `summary.json`

stdout example:

```json
{"status":"suspicious","nextAction":"capture_or_review","summary":"summary.json"}
```

## Exit Code Convention

- `0`: success with no blocking issue
- `10`: success, but result is `suspicious`
- `20`: success, but result is `fail`
- `1`: command execution failure

Agents should consume exit codes and JSON fields, not free-form log text.

## Rubric

Recommended new file:

- `docs/harness/rubric.md`

The first phase should use four top-level dimensions, each scored from `0-3`.

### `Legibility`

Checks:

- text too close to borders
- text crossed by connectors, borders, or symbols
- visible clipping
- severe local crowding

### `Structural Clarity`

Checks:

- connector semantics are clear
- arrows, cardinality markers, and frame separators are readable
- structural hierarchy is easy to see

### `Spatial Balance`

Checks:

- whitespace imbalance
- meaningless long edges or stretched layouts
- obvious visual skew or one-sided compression

### `Visual Taste`

Checks:

- technically valid but awkward-looking layouts
- jagged connector routing
- locally piled-up labels
- inconsistent spacing style

The rule layer should mostly produce evidence for the first three dimensions. `Visual Taste` can stay empty in phase one and be filled by an external visual judge or human review.

## Run Artifact Schema

Each run should write to a fixed layout such as:

- `artifacts/harness/<run-id>/input.pintora`
- `artifacts/harness/<run-id>/render.svg`
- `artifacts/harness/<run-id>/render.png`
- `artifacts/harness/<run-id>/browser.png`
- `artifacts/harness/<run-id>/metrics.json`
- `artifacts/harness/<run-id>/findings.json`
- `artifacts/harness/<run-id>/summary.json`

Notes:

- `render.png` is optional, but recommended for quick human inspection
- `browser.png` is required only for `suspicious` / `fail`

### Suggested `summary.json` shape

```json
{
  "run_id": "2026-04-07T12-30-15Z-er-relationship-spacing-01",
  "case_id": "er.relationship-spacing-01",
  "diagram_type": "er",
  "status": "suspicious",
  "pipeline": ["render-svg", "inspect-svg", "capture-browser"],
  "artifacts": {
    "svg": "render.svg",
    "png": "render.png",
    "browser_png": "browser.png"
  },
  "scores": {
    "legibility": 3,
    "structural_clarity": 2,
    "spatial_balance": 2,
    "visual_taste": null
  },
  "top_findings": [
    "right endpoint marker may intrude into target entity border"
  ],
  "next_action": "human_review_or_visual_judge",
  "judge": {
    "required": true,
    "inputs": {
      "rubric": "docs/harness/rubric.md",
      "artifacts": ["render.svg", "browser.png", "findings.json"]
    }
  }
}
```

## Case Registry

Recommended new files:

- `harness/cases/registry.json`
- `harness/cases/er/*.pintora`
- `harness/cases/sequence/*.pintora`
- `harness/cases/_shared/*.json`

### Example case metadata

```json
{
  "id": "er.relationship-spacing-01",
  "diagram_type": "er",
  "title": "ER horizontal marker should stay outside entity border",
  "input_file": "er/relationship-spacing-01.pintora",
  "tags": ["spacing", "cardinality", "layout"],
  "checks": ["svg-structure", "er-relationship-spacing"],
  "escalation_policy": {
    "capture_browser_on": ["suspicious", "fail"]
  },
  "golden": {
    "require_svg": true,
    "require_browser_png": false
  }
}
```

This keeps case-to-rule mapping in the repository instead of in prompt memory.

## First-Phase Rule Set

The first phase should only cover `er` and `sequence`, but it should go deep on high-value failures.

### ER Rules

#### `entity-border-clearance`

Checks:

- minimum distance between labels, cardinality markers, inheritance triangles, and entity borders

Purpose:

- catches markers intruding into borders and labels glued to boxes

#### `relationship-label-lane-stability`

Checks:

- whether relationship labels occupy a stable lane without colliding with lines, borders, or marker clearance zones

#### `shared-border-coordination`

Checks:

- whether adjacent entities or shared borders create doubled lines or visual conflicts

#### `symbol-direction-consistency`

Checks:

- whether inheritance triangle direction matches the semantic direction

#### `crowding-hotspot`

Checks:

- whether headers, comments, and attribute rows create local crowding hotspots

### Sequence Rules

#### `lifeline-label-separation`

Checks:

- minimum distance between actor labels, top lifeline regions, and dividers

#### `message-label-collision`

Checks:

- whether message labels collide with activations, dividers, or neighboring message lines

#### `activation-stack-clarity`

Checks:

- whether nested activations become too narrow, overlap, or become visually indistinguishable

#### `alt-loop-frame-legibility`

Checks:

- whether frame titles, separators, and bodies crowd each other

#### `edge-overflow`

Checks:

- whether outermost elements are pushed too close to the viewBox edges

## Agent Orchestration Loop

This design assumes orchestration is handled by an external agent rather than by the harness itself.

Recommended loop:

1. read `registry.json`
2. run `render-svg`
3. run `inspect-svg`
4. if `status=ok`, stop
5. if `status=suspicious` or `fail`, run `capture-browser`
6. run `summarize-case`
7. let the external agent produce repair suggestions, suspected root causes, and likely files to inspect

Because phase one explicitly forbids automatic code editing, the loop should terminate in one of these outcomes:

- repair suggestions
- human review request
- better evidence for the next manual edit iteration

## Browser Capture Stability Requirements

To keep screenshot evidence reproducible, `capture-browser` should fix the following:

- one stable preview entry
- one stable query parameter format
- fixed `renderer=svg`
- fixed viewport, for example `1440x960`
- fixed device scale factor, for example `1`
- wait until fonts are loaded before capture
- fixed theme and background
- capture the diagram container only, not the entire page
- use a separate output directory per run

Without these constraints, screenshot evidence becomes too noisy to trust.

## Repository Placement

Recommended new directories:

- `tools/harness/`
- `tools/harness/commands/`
- `tools/harness/lib/`
- `harness/cases/`
- `docs/harness/`

Suggested ownership:

- `tools/harness/` for command implementations and schemas
- `harness/cases/` for cases and the registry
- `docs/harness/` for rubric and agent usage docs

This keeps the development harness separate from runtime product packages.

## Phased Rollout

### Phase 1

- implement `render-svg`
- implement `inspect-svg`
- add `registry.json`
- add 5-10 high-value `er` / `sequence` cases

### Phase 2

- implement `capture-browser`
- stabilize screenshot conditions
- make `summary.json` reliably emit `suspicious` / `fail`

### Phase 3

- add `rubric.md`
- let external agents or humans consume artifacts through the rubric
- add a pluggable judge adapter only if needed

## Risks and Constraints

1. False positives in rules
   - overly aggressive geometry heuristics will push agents toward the wrong fixes
2. Browser instability
   - screenshots lose value if fonts, viewport, DPR, or theme drift
3. Diagram-type differences
   - generic rules help, but diagram-specific checks must be onboarded incrementally
4. Judge drift
   - any future visual judge needs few-shot calibration or "beauty" scoring will drift

## Decision Summary

Recommended direction:

- use small harness primitives instead of one monolithic runner
- run `svg` structural inspection first, then browser capture only when needed
- keep the judge external in phase one, while reserving schema hooks
- use `rubric`, `case registry`, and `run artifacts` as the repository system of record
- limit the first phase to `er` and `sequence`

The main value of this design is not "full automation." The value is a low-noise, reusable, and handoff-friendly validation loop for agents working on diagram layout quality.
