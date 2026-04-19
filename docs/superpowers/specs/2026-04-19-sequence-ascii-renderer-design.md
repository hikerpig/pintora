# Sequence ASCII Renderer Design

Date: 2026-04-19

## Goal

Design a better Unicode text renderer path for Pintora, starting with `sequenceDiagram`.

The design should:

- preserve Pintora's existing SVG/Canvas architecture
- move sequence ASCII output closer to `beautiful-mermaid`
- avoid renderer-side layout repair
- avoid reconstructing sequence structure from low-level geometry
- create a foundation that can later extend to `alt` / `opt` / `loop` / `activate`

Phase 1 scope:

- base sequence messages
- dashed / open / open-dashed messages
- self-messages
- dividers
- notes (`left` / `right` / `over`)
- CJK and mixed-width labels

Out of scope for phase 1:

- full fidelity block frame rendering
- polished nested activation rendering
- a generic text routing engine for all diagram types

## Retrospective-Driven Constraints

The retrospective in `docs/ascii-renderer-retrospective.md` changes the design in one important way.

The previous implementation failed mainly because it relied on this pattern:

```text
geometry
  -> sampling
  -> snapping
  -> overlap repair
  -> semantic fallback
```

That led to the known problems:

- renderer-side layout repair in `normalize-ops`
- geometry sampling that permanently destroyed intent
- sequence structure being inferred from generic rect/line/path output
- ASCII-specific constraints leaking back into artists as ad hoc semantic tags

The new design must enforce these rules:

1. The renderer must not repair layout defects.
2. ASCII must not recover sequence structure from generic geometry.
3. Sequence ASCII must consume a higher-level input than raw `GraphicsIR`.
4. SVG/Canvas and ASCII may share the same upstream layout, but they do not need to share the same final render input format.

## Core Decision

For `sequenceDiagram`, ASCII should not render directly from generic `GraphicsIR`.

Instead, sequence rendering should become a dual-output pipeline:

- SVG/Canvas continue to consume `GraphicsIR`
- ASCII consumes a new higher-level `SequenceAsciiIR`

This is not a separate parser or separate diagram engine. It is a second renderer-oriented output from the same sequence layout stage.

## Revised Architecture

### Existing Stable Path

For SVG and Canvas:

```text
sequence parser / db / layout
  -> GraphicsIR
  -> SvgRenderer / CanvasRenderer
```

That path stays unchanged.

### New Sequence ASCII Path

For ASCII:

```text
sequence parser / db / layout
  -> SequenceAsciiIR
  -> SequenceTextPlan
  -> SequenceAsciiRenderer
  -> plain text
```

The crucial change is that ASCII no longer starts from generic scene geometry.

## Why This Split Is Correct

### What We Keep

Keep these ideas from the earlier design:

- one sequence parser and one sequence layout source of truth
- low-fidelity rendering is semantic, not pixel-faithful
- compact Unicode glyphs are the right output strategy
- sequence ASCII needs explicit rows, columns, and lanes

### What We Discard

Discard these ideas from the earlier design:

- `mark-walker -> normalize-ops -> rasterizer` as the primary path for sequence ASCII
- recovering actors, lifelines, and messages from rect/line/text geometry
- renderer-side semantic extraction for sequence
- sequence artists manually decorating low-level marks so ASCII can guess intent later

### Why This Is Not “A Second Layout Engine”

The layout engine still stays single-source.

What changes is only the renderer-facing contract:

- `GraphicsIR` is the contract for SVG/Canvas
- `SequenceAsciiIR` is the contract for sequence ASCII

That is a renderer split, not a parser or layout split.

## What To Learn From Beautiful Mermaid

`beautiful-mermaid` is worth copying in three narrow ways:

- text rendering should begin from a discrete layout model
- message labels, arrows, notes, and dividers must be first-class occupants
- self-messages and common arrows should use reviewed templates, not sampled geometry

It is not worth copying wholesale:

- no separate parser
- no separate sequence layout engine
- no independent project-level architecture for ASCII

The lesson is about renderer input shape, not repo structure.

## SequenceAsciiIR

Introduce a sequence-only renderer contract for ASCII.

This model should be emitted after sequence layout has already decided actor ordering, message chronology, note anchors, and block structure.

`SequenceAsciiIR` is not public API. It is an internal renderer input.

### Suggested Shape

```ts
type SequenceAsciiIR = {
  meta: {
    title?: string
    direction: 'TB'
  }
  actors: SequenceAsciiActor[]
  events: SequenceAsciiEvent[]
  spans?: SequenceAsciiSpan[]
}

type SequenceAsciiActor = {
  id: string
  label: string
  classifier?: string
}

type SequenceAsciiEvent =
  | SequenceAsciiMessage
  | SequenceAsciiNote
  | SequenceAsciiDivider
  | SequenceAsciiActivation

type SequenceAsciiMessage = {
  kind: 'message'
  fromActorId: string
  toActorId: string
  label: string
  style: 'solid' | 'dashed' | 'open' | 'open-dashed'
  isSelf: boolean
}

type SequenceAsciiNote = {
  kind: 'note'
  anchorActorIds: string[]
  placement: 'left' | 'right' | 'over'
  text: string
}

type SequenceAsciiDivider = {
  kind: 'divider'
  text: string
}

type SequenceAsciiActivation = {
  kind: 'activation'
  actorId: string
  startsAtEventIndex: number
  endsAtEventIndex: number
  level: number
}

type SequenceAsciiSpan = {
  kind: 'loop' | 'opt' | 'alt' | 'par'
  startEventIndex: number
  endEventIndex: number
  label: string
  sections?: Array<{
    label: string
    eventIndex: number
  }>
}
```

Phase 1 does not need the full shape implemented, but the design should reserve it now.

## Production Point Of SequenceAsciiIR

This is the most important structural decision in the design.

`SequenceAsciiIR` should be produced:

- after sequence parsing / db resolution
- after sequence layout has decided actor order, message order, note anchoring, and span boundaries
- before any renderer-specific artist output is generated

That means the intended shape is:

```text
sequence parser / db
  -> SequenceLayoutResult
  -> toGraphicsIR(layoutResult)
  -> toSequenceAsciiIR(layoutResult)
```

The key point is that `SequenceLayoutResult` is the shared upstream truth, and both renderer contracts are adapters over it.

### Recommended Shared Layout Layer

Introduce or formalize a renderer-neutral layout result for sequence diagrams:

```ts
type SequenceLayoutResult = {
  actors: LayoutActor[]
  messages: LayoutMessage[]
  notes: LayoutNote[]
  activations: LayoutActivation[]
  spans: LayoutSpan[]
  title?: string
}
```

This type does not need to be public and does not need to match the final exact TypeScript surface above. The important property is that it is:

- layout-complete
- renderer-neutral
- rich enough to drive both `GraphicsIR` and `SequenceAsciiIR`

### Phase 1 Minimal Field Set

Phase 1 should keep `SequenceLayoutResult` intentionally small.

The goal is not to expose every internal detail of the current sequence artist. The goal is to expose only the renderer-neutral layout facts that ASCII phase 1 actually needs.

Recommended minimum field set:

```ts
type SequenceLayoutResult = {
  title?: string
  actors: Array<{
    id: string
    label: string
    classifier?: string
    order: number
  }>
  events: Array<
    | {
        kind: 'message'
        index: number
        fromActorId: string
        toActorId: string
        label: string
        style: 'solid' | 'dashed' | 'open' | 'open-dashed'
        isSelf: boolean
      }
    | {
        kind: 'note'
        index: number
        anchorActorIds: string[]
        placement: 'left' | 'right' | 'over'
        text: string
      }
    | {
        kind: 'divider'
        index: number
        text: string
      }
  >
  activations: Array<{
    actorId: string
    startEventIndex: number
    endEventIndex: number
    level: number
  }>
  spans: Array<{
    kind: 'loop' | 'opt' | 'alt' | 'par'
    startEventIndex: number
    endEventIndex: number
    label: string
    sections?: Array<{
      eventIndex: number
      label: string
    }>
  }>
}
```

Phase 1 may not render all of these fields completely, but they should be present in the layout result if they already exist in the current sequence model state.

### Why This Field Set Is Minimal Enough

ASCII phase 1 needs only these categories of information:

- stable actor order
- stable event order
- message endpoints and styles
- note anchors and placement
- divider text
- activation ranges for future occupancy handling
- span boundaries for future block support

It does not need, in phase 1:

- exact drawing coordinates
- shape/path geometry
- renderer-specific style objects
- per-mark semantic decorations
- final box widths or character cell positions

Those belong later, in `SequenceTextPlan`, not in the shared layout result.

### What Phase 1 Should Not Leak

Do not let `SequenceLayoutResult` become a lightly renamed dump of current artist internals.

Specifically, phase 1 should avoid exposing:

- raw `MessageModel`, `NoteModel`, or divider view-model objects
- bounding boxes that only exist for SVG drawing
- mutable maps keyed by internal item ids
- pre-render mark attributes such as stroke/fill/font payloads

If the current code stores those internally, the adapter should translate them into the smaller stable shape above.

### Why Layout Result Is The Right Production Point

Because ASCII needs layout intent, not drawing geometry.

What ASCII needs most is:

- actor order
- actor identity
- message chronology
- message endpoints
- note anchors
- divider placement
- span boundaries
- activation ranges

All of that exists naturally at the layout-result level.

By contrast, once the artist starts producing rects, lines, paths, and text marks, those concepts have already been lowered into drawing geometry. That is exactly the point where the retrospective says the previous design started to fail.

### Rejected Production Point 1: From GraphicsIR

Rejected approach:

```text
SequenceLayoutResult
  -> GraphicsIR
  -> extract SequenceAsciiIR
```

Why it is wrong:

- recovers structure from low-level geometry
- repeats the old `sample -> snap -> recover intent` failure mode
- couples sequence ASCII quality to incidental artist output
- encourages renderer-side repair again

Verdict:

- reject

### Rejected Production Point 2: From Sequence Artist

Rejected approach:

```text
SequenceLayoutResult
  -> sequence artist
  -> emit GraphicsIR
  -> also emit SequenceAsciiIR
```

Why it is still not good enough:

- artist is already a presentation-layer boundary
- the artist thinks in terms of shapes and marks, not renderer-neutral sequence structure
- it keeps ASCII too close to drawing concerns
- it invites “just add one more semantic flag” drift back into the old model

This is better than extracting from `GraphicsIR`, but still not the right abstraction.

Verdict:

- reject as the target architecture
- acceptable only as a short-lived migration tactic if needed

### Recommended Production Point: Layout Adapter

Recommended approach:

```text
SequenceLayoutResult
  -> toGraphicsIR(layoutResult)
  -> toSequenceAsciiIR(layoutResult)
```

Why it is best:

- one upstream layout truth
- no structure recovery from geometry
- ASCII stays semantic and deterministic
- SVG/Canvas and ASCII can evolve independently at the renderer contract layer
- adapter boundaries are easy to test

Verdict:

- recommend

### Migration Guidance

Even if the current codebase does not yet expose a clean `SequenceLayoutResult`, the implementation direction should still move toward it.

A reasonable migration path is:

1. identify the current sequence model/state that already contains actor ordering, message models, note models, divider models, activation state, and group/span state
2. extract that state into a renderer-neutral layout result type
3. keep the existing SVG/Canvas artist working by adapting from that layout result to `GraphicsIR`
4. add a new adapter from that same layout result to `SequenceAsciiIR`

This lets implementation start from today's code while still converging toward the right architecture.

### Phase 1 Refactoring Boundary

Phase 1 should be explicit about what it does not try to clean up.

Phase 1 requirement:

- make the existing sequence layout state explicitly converge into a reusable layout-result view

Phase 1 non-requirement:

- do not force a full internal rewrite of the current sequence artist or model structure

In practice, this means phase 1 may wrap and normalize the existing internal state into a `SequenceLayoutResult` adapter layer, even if the underlying artist code still internally uses separate maps and model objects such as:

- message models
- note models
- divider models
- activation stacks
- loop/span tracking structures

That is acceptable for phase 1 as long as:

- the adapter output is explicit and testable
- `SequenceAsciiIR` depends on the adapter result, not on raw artist geometry
- the design still leaves room to refactor the underlying sequence layout into a cleaner native `SequenceLayoutResult` later

This keeps the first phase bounded while still forcing the architecture to move in the right direction.

## SequenceTextPlan

`SequenceAsciiIR` is still semantic and logical. It is not yet drawable.

The next step is `SequenceTextPlan`, which converts sequence intent into discrete character occupancy.

### Responsibility

`SequenceTextPlan` should decide:

- actor columns
- header box widths
- lifeline columns
- event row bands
- label rows
- note lanes
- divider rows
- self-message templates
- future block and activation occupancy

It should not decide:

- parser semantics
- sequence chronology
- actor ordering
- note anchoring semantics

Those belong upstream in sequence layout / IR generation.

### Suggested Data Model

#### Columns

- `actorId`
- `centerCol`
- `headerLeftCol`
- `headerRightCol`
- `lifelineCol`

#### Rows

- `kind`
- `startRow`
- `endRow`

Phase 1 row kinds:

- `message-label`
- `message-arrow`
- `self-message`
- `divider`
- `note`
- reserved `block-header`

#### Messages

- `fromActorId`
- `toActorId`
- `arrowRow`
- `labelRows`
- `style`
- `isSelf`

#### Notes

- `anchorActors`
- `lane`
- `boxCols`
- `boxRows`

#### Activations

- `actorId`
- `offsetLevel`
- `startRow`
- `endRow`

### Planning Algorithm Order

`SequenceTextPlan` should be computed in a fixed staged order.

The main rule is:

- do not place and repair at the same time
- do not let later elements implicitly rewrite earlier structural decisions

Recommended phase order:

```text
1. actor columns
2. base event rows
3. note lanes
4. self-message templates
5. divider rows
6. activation occupancy
7. future span/block occupancy
```

### Phase 1: Actor Columns

First decide actor columns from actor order and header label widths.

This phase should determine:

- actor sequence order
- header box width per actor
- header center column
- lifeline column
- base inter-actor spacing

This phase may consider message label width only as a spacing input.

It must not:

- place message rows
- place notes
- place divider rows

Reason:

- columns are the structural backbone of the diagram

### Phase 2: Base Event Rows

Next allocate the chronological row bands for normal events.

This phase should determine:

- one or more label rows for each message
- one arrow row for each non-self message
- one base row slot for each future divider / note / self-message event

This phase should preserve event order exactly as emitted by `SequenceLayoutResult`.

It must not:

- change actor columns
- insert note geometry directly

Reason:

- the sequence timeline is the second structural backbone after actor columns

### Phase 3: Note Lanes

Then place notes into dedicated lateral or over-actor lanes.

This phase should determine:

- left note lane occupancy
- right note lane occupancy
- over-note horizontal span
- note box row span relative to the owning event band

This phase may expand total diagram width.

It must not:

- move lifeline columns
- force message labels onto different rows after the fact

Reason:

- notes are external attachments to the timeline, not timeline-defining structure

### Phase 4: Self-Message Templates

Then expand self-messages from logical events into reviewed loop templates.

This phase should determine:

- self-loop horizontal excursion
- self-loop row span
- self-message label placement

This phase may reserve extra horizontal room on the actor's outer side.

It must not:

- change actor order
- reinterpret self-messages from geometry

Reason:

- self-messages are special-case templates that depend on already-known actor columns and base event rows

### Phase 5: Divider Rows

Then place dividers into dedicated rows.

This phase should determine:

- divider stroke row
- divider label segment
- divider text exclusion zone

It must ensure:

- divider text and divider rule do not occupy the same cells

Reason:

- dividers are full-width timeline separators and should be resolved after the main event row structure is known

### Phase 6: Activation Occupancy

Then calculate activation occupancy.

Phase 1 does not require polished activation rendering, but the plan should still reserve:

- actor-local horizontal offset per nesting level
- activation start and end row span

Reason:

- activation occupancy affects future compatibility even if the first rendering pass is visually simple

### Phase 7: Future Span And Block Occupancy

Finally reserve span and block occupancy for later phases.

Phase 1 may keep this minimal, but the planning order should already assume that:

- block headers consume rows
- section boundaries consume rows
- block bodies define horizontal spans across actors

Reason:

- even if phase 1 does not render full block frames, the algorithm should not paint later work into a corner

### Why This Order Matters

This order enforces a clean dependency graph:

- columns depend only on actor order and spacing inputs
- event rows depend on columns and chronology
- notes depend on columns and event rows
- self-message templates depend on columns and event rows
- dividers depend on event rows
- activations depend on actor columns and event chronology

What this prevents:

- late note placement changing actor structure
- divider rendering pushing message rows after placement
- self-message rendering degenerating into local geometry hacks
- activation logic leaking backward into core message placement

In short:

- structure first
- occupancy second
- templates third
- no repair loop

## Phase 1 Implementation Slice

Phase 1 should stay deliberately narrow.

The goal is not “sequence ASCII architecture solved forever”. The goal is to deliver one clean vertical slice that proves the new contract shape works.

### Phase 1 Modules

Phase 1 should produce exactly these new or clarified layers:

1. `SequenceLayoutResult` adapter
2. `SequenceAsciiIR` adapter
3. `SequenceTextPlan`
4. `SequenceAsciiRenderer`

Recommended conceptual flow:

```text
existing sequence parser / db / layout state
  -> SequenceLayoutResult adapter
  -> SequenceAsciiIR adapter
  -> SequenceTextPlan
  -> SequenceAsciiRenderer
  -> text output
```

### Module Responsibilities

#### 1. `SequenceLayoutResult` Adapter

Responsibility:

- collect stable renderer-neutral layout facts from the existing sequence implementation

Phase 1 output must include:

- actor order and labels
- chronological event list
- note anchors and placement
- divider events
- activation ranges if already available
- span boundaries if already available

Phase 1 must not require:

- replacing the current internal sequence model
- changing SVG/Canvas behavior

#### 2. `SequenceAsciiIR` Adapter

Responsibility:

- translate `SequenceLayoutResult` into the smaller ASCII-facing renderer contract

Phase 1 output must include:

- actors
- messages
- notes
- dividers

Phase 1 may include:

- activations
- spans

But phase 1 does not need to render all of them fully.

#### 3. `SequenceTextPlan`

Responsibility:

- compute actor columns, event rows, note lanes, self-message template occupancy, and divider rows

Phase 1 must fully support:

- normal messages
- dashed / open / open-dashed styles
- self-messages
- notes (`left` / `right` / `over`)
- dividers
- CJK-aware label width

Phase 1 may reserve but not fully exploit:

- activation occupancy
- span/block occupancy

#### 4. `SequenceAsciiRenderer`

Responsibility:

- turn `SequenceTextPlan` into final Unicode text output

Phase 1 rendering must be template-driven for:

- actor headers
- lifelines
- horizontal arrows
- self-message loops
- note boxes
- divider rows

Phase 1 should not depend on:

- generic geometry rasterization
- path flattening
- `mark-walker`
- `normalize-ops`

### Phase 1 Deliverables

Phase 1 is complete when all of the following are true:

- there is a stable path from sequence layout state to `SequenceLayoutResult`
- `SequenceAsciiIR` is produced from that layout result
- `SequenceTextPlan` is computed without repair loops
- `SequenceAsciiRenderer` can render:
  - base messages
  - dashed / open / open-dashed arrows
  - self-messages
  - notes
  - dividers
  - CJK labels

### Phase 1 Explicit Non-Goals

Phase 1 should explicitly not do these things:

- no generic ASCII architecture rewrite for all diagram types
- no attempt to replace every use of `GraphicsIR`
- no full refactor of sequence artist internals
- no full block rendering for `alt` / `opt` / `loop` / `par`
- no final activation styling system
- no attempt to preserve compatibility with the old sequence-through-geometry ASCII path

### Phase 1 Test Surface

Phase 1 tests should focus on contract boundaries as well as final output.

Minimum required test layers:

- adapter tests:
  - current sequence layout state -> `SequenceLayoutResult`
  - `SequenceLayoutResult` -> `SequenceAsciiIR`
- planner tests:
  - actor columns
  - message rows
  - note lanes
  - self-message occupancy
  - divider rows
- renderer tests:
  - base messages
  - dashed / open / open-dashed arrows
  - self-messages
  - notes
  - dividers
  - CJK labels

This matters because the architecture is now adapter-driven. End-to-end golden tests alone are not enough.

### Phase 1 Success Signal

Phase 1 should make one thing obvious:

- sequence ASCII output quality no longer depends on recovering meaning from generic mark geometry

If that is not true, then phase 1 has not actually landed the new architecture, even if the screenshots look better.

## Rendering Rules For Phase 1

### Actor Headers

- actor header width contributes to column width
- actor headers stay centered on the actor column
- header text is resolved before message spacing

### Lifelines

- each actor owns one stable `lifelineCol`
- lifelines are drawn as a deliberate template, not inherited from low-level line geometry

### Normal Messages

- message labels occupy row(s) above the arrow row
- labels and shafts never share the same row
- arrowheads use compact Unicode glyphs
- long labels expand spacing only through `SequenceTextPlan`

### Self Messages

- self-messages use a fixed reviewed loop template
- no path sampling
- the label occupies a reserved row above or inside the loop template

### Dividers

- each divider owns its own row
- divider text is centered inside a reserved label segment
- divider text must never sit on the same cells as the horizontal rule

### Notes

- `left` notes occupy a dedicated lane left of the anchor actor
- `right` notes occupy a dedicated lane right of the anchor actor
- `over` notes occupy a centered lane over one or more anchor actors
- notes do not borrow lifeline columns

### Blocks And Activations

For phase 1:

- preserve occupancy for later block headers
- preserve activation occupancy even if drawing remains simple

## Relationship To GraphicsIR

`GraphicsIR` still matters, but only for SVG/Canvas and for cross-renderer consistency at the layout level.

For sequence ASCII, `GraphicsIR` is no longer the main renderer input.

That means:

- do not add `semantic.sequence.*` just so ASCII can recover structure from marks
- do not use `mark-walker` as the primary source of sequence intent
- do not expect generic rect/line/text marks to be a stable source of ASCII planning information

Instead:

- generate `GraphicsIR` and `SequenceAsciiIR` side by side from the same sequence layout state

## Comparison Of Approaches

### Approach A: Keep Patching Generic ASCII Renderer

Description:

- keep sequence ASCII on the generic `GraphicsIR -> mark-walker -> normalize-ops -> rasterizer` path

Pros:

- smallest visible architectural change

Cons:

- repeats the exact failure mode from the retrospective
- keeps renderer-side repair pressure
- forces structure recovery from low-level geometry

Verdict:

- reject

### Approach B: Dual Output, Shared Layout

Description:

- keep one sequence parser and one sequence layout pipeline
- emit `GraphicsIR` for SVG/Canvas
- emit `SequenceAsciiIR` for ASCII
- build `SequenceTextPlan` from `SequenceAsciiIR`

Pros:

- preserves shared layout truth
- prevents geometry recovery
- keeps ASCII renderer simple and deterministic
- aligns with the retrospective

Cons:

- introduces a second renderer contract for sequence
- requires explicit maintenance of `SequenceAsciiIR`

Verdict:

- recommend

### Approach C: Fully Independent Sequence ASCII Engine

Description:

- new parser / new layout / new renderer stack for ASCII

Pros:

- maximum freedom

Cons:

- duplicates parser and layout logic
- high long-term maintenance cost

Verdict:

- reject

## Incremental Implementation Direction

### Step 1: Define `SequenceAsciiIR`

Goal:

- make the sequence layout stage able to emit a high-level ASCII input model

Output:

- a deterministic, geometry-free sequence renderer contract

### Step 2: Build `SequenceTextPlan`

Goal:

- allocate discrete columns, rows, and lanes from `SequenceAsciiIR`

Output:

- stable row and column occupancy for phase 1 features

### Step 3: Build A Sequence-Specific Text Renderer

Goal:

- render actor headers, lifelines, messages, self-messages, notes, and dividers directly from the plan

Output:

- phase 1 sequence ASCII output without generic geometry rasterization

### Step 4: Lock Regression Coverage

Add regression coverage for:

- base messages
- dashed / open / open-dashed arrows
- self-messages
- dividers
- notes left / right / over
- CJK labels
- long labels that affect spacing

## Acceptance Criteria For Phase 1

Phase 1 is successful when:

- sequence headers and lifelines are visually stable
- message labels never collide with arrow rows
- self-messages render from a deliberate template
- notes occupy predictable external lanes
- divider labels stay off stroke rows
- no sequence ASCII behavior depends on recovering structure from generic `GraphicsIR` geometry

Phase 1 is not required to fully solve:

- nested block visuals
- all activation styling cases
- generic ASCII support for every diagram family

## Risks

### Risk: `SequenceAsciiIR` Becomes A Shadow Layout Engine

If `SequenceAsciiIR` starts recomputing layout decisions that already exist upstream, the split becomes wasteful.

Mitigation:

- keep it as a renderer contract, not a second layout engine
- only encode actor order, events, anchors, and spans already known upstream

### Risk: SVG/Canvas And ASCII Drift

If `GraphicsIR` and `SequenceAsciiIR` are generated from different logic, the outputs will diverge semantically.

Mitigation:

- derive both outputs from the same sequence layout state
- keep event order, actor order, and span boundaries shared

### Risk: Generic ASCII Renderer Remains A Half-Owner Of Sequence

If sequence logic still partly lives in generic rasterization and partly in `SequenceAsciiIR`, complexity will split across layers again.

Mitigation:

- make sequence ASCII a dedicated renderer path after the renderer dispatch point
- use the generic ASCII path only for other diagram types

## Decision

Adopt Approach B:

- keep one parser and one layout source of truth
- add a dedicated `SequenceAsciiIR` contract for sequence ASCII
- generate `SequenceTextPlan` from `SequenceAsciiIR`
- render sequence ASCII directly from that plan
- stop treating generic `GraphicsIR` geometry as the main input for sequence ASCII

## Summary Of Keep vs Discard

Keep:

- shared upstream sequence layout
- semantic-first low-fidelity rendering
- compact Unicode glyph strategy
- phase-based sequence text planning

Discard:

- recovering sequence structure from generic geometry
- renderer-side layout repair as the main strategy
- `mark-walker` as the primary entry point for sequence ASCII
- forcing sequence artists to annotate generic marks for ASCII reconstruction
