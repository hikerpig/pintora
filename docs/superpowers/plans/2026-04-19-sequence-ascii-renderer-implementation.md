# Sequence ASCII Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the phase-1 sequence ASCII renderer path so `sequenceDiagram` renders from `SequenceAsciiIR` and `SequenceTextPlan` rather than from generic `GraphicsIR` geometry.

**Architecture:** Keep one sequence parser and one upstream layout truth, but make phase 1 explicit by first capturing the current artist state into a `SequenceLayoutSnapshot`, then adapting that into `SequenceLayoutResult` and `SequenceAsciiIR`. Preserve the existing `render(ir, opts)` API by attaching ASCII-only payloads to `GraphicsIR.rendererData.ascii`, and let a dedicated `AsciiRenderer` validate the embedded sequence payload, build a `SequenceTextPlan`, and render Unicode text directly from it without reading generic scene geometry.

**Tech Stack:** TypeScript, Jest, Pintora core types, sequence diagram artist in `@pintora/diagrams`, renderer registry in `@pintora/renderer`

---

## File Map

### Core plumbing

- Modify: `packages/pintora-core/src/types/graphics.ts`
- Modify: `packages/pintora-renderer/src/renderers/index.ts`
- Create: `packages/pintora-renderer/src/renderers/AsciiRenderer.ts`
- Create: `packages/pintora-renderer/jest.config.js`
- Modify: `jest.config.js`

### Sequence layout and ASCII contracts

- Create: `packages/pintora-diagrams/src/sequence/layout-snapshot.ts`
- Create: `packages/pintora-diagrams/src/sequence/layout-result.ts`
- Create: `packages/pintora-diagrams/src/sequence/ascii-ir.ts`
- Modify: `packages/pintora-diagrams/src/sequence/index.ts`
- Modify: `packages/pintora-diagrams/src/sequence/artist.ts`
- Modify: `packages/pintora-diagrams/src/sequence/artist/type.ts`
- Create: `packages/pintora-diagrams/src/sequence/__tests__/sequence-layout-result.spec.ts`
- Create: `packages/pintora-diagrams/src/sequence/__tests__/sequence-ascii-ir.spec.ts`

### Sequence ASCII planning and rendering

- Create: `packages/pintora-renderer/src/renderers/ascii/sequence/types.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/sequence/plan.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/sequence/render.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/sequence/text-canvas.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/__tests__/test-helpers.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/__tests__/sequence-plan.spec.ts`

## Task 1: Add Renderer Plumbing And Test Coverage

**Files:**
- Modify: `packages/pintora-core/src/types/graphics.ts`
- Modify: `packages/pintora-renderer/src/renderers/index.ts`
- Create: `packages/pintora-renderer/src/renderers/AsciiRenderer.ts`
- Create: `packages/pintora-renderer/jest.config.js`
- Modify: `jest.config.js`
- Test: `packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts`

- [ ] **Step 1: Write the failing renderer smoke test and package Jest config**

```ts
// packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts
import { configApi } from '@pintora/core'
import { AsciiRenderer } from '../../AsciiRenderer'

const sequenceGraphicIR = {
  width: 120,
  height: 80,
  mark: { type: 'group', children: [] },
  rendererData: {
    ascii: {
      sequence: {
        meta: { direction: 'TB' },
        actors: [
          { id: 'User', label: 'User' },
          { id: 'Pintora', label: 'Pintora' },
        ],
        events: [
          {
            kind: 'message',
            fromActorId: 'User',
            toActorId: 'Pintora',
            label: 'render this',
            style: 'solid',
            isSelf: false,
          },
        ],
      },
    },
  },
} as any

describe('AsciiRenderer', () => {
  const originalConfig = configApi.cloneConfig()

  afterEach(() => {
    configApi.replaceConfig(originalConfig)
  })

  it('renders a PRE root and exposes text content from rendererData', () => {
    const container = document.createElement('div')
    const renderer = new AsciiRenderer(sequenceGraphicIR)

    renderer.setContainer(container)
    renderer.render()

    expect(renderer.getRootElement().tagName).toBe('PRE')
    expect(renderer.getTextContent?.()).toContain('render this')
  })
})
```

```js
// packages/pintora-renderer/jest.config.js
const baseConfig = require('../../jest.config.base')

module.exports = {
  ...baseConfig,
  displayName: '@pintora/renderer',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@pintora/core$': '<rootDir>/../pintora-core/src/index.ts',
    '^@pintora/core/(.*)$': '<rootDir>/../pintora-core/src/$1',
    '^@pintora/diagrams$': '<rootDir>/../pintora-diagrams/src/index.ts',
    '^@pintora/diagrams/(.*)$': '<rootDir>/../pintora-diagrams/src/$1',
    '^@pintora/renderer$': '<rootDir>/src/index.ts',
    '^@pintora/renderer/(.*)$': '<rootDir>/src/$1',
  },
}
```

- [ ] **Step 2: Run the renderer smoke test to verify it fails**

Run: `pnpm exec jest --config packages/pintora-renderer/jest.config.js packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts --runInBand`

Expected: FAIL with errors such as `Cannot find module '../../AsciiRenderer'` or missing renderer registration for `'ascii'`.

- [ ] **Step 3: Add `rendererData` to `GraphicsIR`, register `'ascii'`, and implement the minimal renderer shell**

```ts
// packages/pintora-core/src/types/graphics.ts
export interface GraphicsIR extends Figure {
  bgColor?: string
  rendererData?: {
    ascii?: {
      layout?: unknown
      sequence?: unknown
    }
  }
}
```

```ts
// packages/pintora-renderer/src/renderers/index.ts
import { GraphicsIR } from '@pintora/core/lib/type'
import { IRenderer } from '../type'
import { BaseRenderer } from './base'
import { SvgRenderer } from './SvgRenderer'
import { CanvasRenderer } from './CanvasRenderer'
import { AsciiRenderer } from './AsciiRenderer'

export { BaseRenderer }

export type RendererType = 'svg' | 'canvas' | 'ascii'

type RendererConstructor = {
  new (ir: GraphicsIR): IRenderer
}

class RendererRegistry {
  renderers: Record<RendererType, RendererConstructor | null> = {
    svg: SvgRenderer,
    canvas: CanvasRenderer,
    ascii: AsciiRenderer,
  }

  getRendererClass(name: RendererType) {
    return this.renderers[name]
  }

  register(name: RendererType, cls: RendererConstructor) {
    this.renderers[name] = cls
  }
}
```

```ts
// packages/pintora-renderer/src/renderers/AsciiRenderer.ts
import { GraphicsIR } from '@pintora/core'
import { IRenderer } from '../type'
import { noop } from '../util'

export class AsciiRenderer implements IRenderer {
  protected container: HTMLElement | null = null
  protected rootElement: HTMLElement | null = null
  protected textContent = ''

  constructor(protected ir: GraphicsIR) {}

  setContainer(container: HTMLElement) {
    this.container = container
    const doc = container.ownerDocument || globalThis.document
    if (doc) this.rootElement = this.createRootElement(doc)
    return this
  }

  render() {
    const sequence = this.ir.rendererData?.ascii?.sequence as any
    this.textContent = sequence ? '[sequence-ascii-pending]' : ''
    const root = this.getRootElement()
    root.textContent = this.textContent
    if (this.container) {
      this.container.innerHTML = ''
      this.container.appendChild(root)
    }
  }

  getRootElement() {
    if (this.rootElement) return this.rootElement
    const doc = globalThis.document
    if (!doc) throw new Error('AsciiRenderer requires a DOM-like document')
    this.rootElement = this.createRootElement(doc)
    return this.rootElement
  }

  getTextContent() {
    return this.textContent
  }

  on() {
    return noop
  }

  protected createRootElement(doc: Document) {
    const pre = doc.createElement('pre')
    pre.style.margin = '0'
    pre.style.whiteSpace = 'pre'
    pre.style.fontFamily = 'monospace'
    pre.style.lineHeight = '1'
    return pre
  }
}
```

- [ ] **Step 4: Add the renderer project to the root Jest matrix and verify the plumbing test reaches the placeholder output**

```js
// jest.config.js
module.exports = {
  reporters: ['default', ['jest-junit', { outputDirectory: './reports' }]],
  projects: [
    '<rootDir>/packages/pintora-core/jest.config.js',
    '<rootDir>/packages/pintora-diagrams/jest.config.js',
    '<rootDir>/packages/pintora-renderer/jest.config.js',
    '<rootDir>/packages/pintora-cli/jest.config.js',
    '<rootDir>/packages/pintora-standalone/jest.config.js',
  ],
}
```

Run: `pnpm exec jest --config packages/pintora-renderer/jest.config.js packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts --runInBand`

Expected: The constructor and registration errors disappear, and the only remaining mismatch is the test still expecting real text instead of the placeholder `'[sequence-ascii-pending]'`.

- [ ] **Step 5: Update the smoke test expectation for the placeholder and commit the plumbing**

```ts
// packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts
expect(renderer.getTextContent?.()).toContain('[sequence-ascii-pending]')
```

Run: `pnpm exec jest --config packages/pintora-renderer/jest.config.js packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts --runInBand`

Expected: PASS

```bash
git add \
  jest.config.js \
  packages/pintora-core/src/types/graphics.ts \
  packages/pintora-renderer/jest.config.js \
  packages/pintora-renderer/src/renderers/index.ts \
  packages/pintora-renderer/src/renderers/AsciiRenderer.ts \
  packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts
git commit -m "test: add ascii renderer plumbing"
```

## Task 2: Extract SequenceLayoutResult And SequenceAsciiIR

**Files:**
- Create: `packages/pintora-diagrams/src/sequence/layout-snapshot.ts`
- Create: `packages/pintora-diagrams/src/sequence/layout-result.ts`
- Create: `packages/pintora-diagrams/src/sequence/ascii-ir.ts`
- Modify: `packages/pintora-diagrams/src/sequence/index.ts`
- Modify: `packages/pintora-diagrams/src/sequence/artist.ts`
- Modify: `packages/pintora-diagrams/src/sequence/artist/type.ts`
- Test: `packages/pintora-diagrams/src/sequence/__tests__/sequence-layout-result.spec.ts`
- Test: `packages/pintora-diagrams/src/sequence/__tests__/sequence-ascii-ir.spec.ts`

- [ ] **Step 1: Write the failing snapshot, layout-result, and ASCII-IR tests**

```ts
// packages/pintora-diagrams/src/sequence/__tests__/sequence-layout-result.spec.ts
import { parseAndDraw, diagramRegistry } from '@pintora/core'
import { DIAGRAMS } from '../../index'
import { LINETYPE, PLACEMENT, SequenceDiagramIR } from '../db'
import { captureSequenceLayoutSnapshot } from '../layout-snapshot'
import { buildSequenceLayoutResult } from '../layout-result'
import { SequenceArtistLayoutState } from '../artist/type'

Object.keys(DIAGRAMS).forEach(name => {
  diagramRegistry.registerDiagram(name, DIAGRAMS[name as keyof typeof DIAGRAMS])
})

describe('sequence ascii adapters', () => {
  it('captures actor and event geometry from explicit artist layout state', () => {
    const ir = {
      title: '',
      actorOrder: ['User', 'Pintora'],
      actors: {
        User: { name: 'User', description: 'User', itemId: 'actor-User' },
        Pintora: { name: 'Pintora', description: 'Pintora', itemId: 'actor-Pintora' },
      },
      messages: [
        {
          id: 'message-0',
          itemId: 'message-0-0',
          from: 'User',
          to: 'Pintora',
          text: 'render this',
          wrap: false,
          type: LINETYPE.SOLID,
        },
        {
          id: 'message-1',
          itemId: 'message-1-2',
          from: 'Pintora',
          to: 'Pintora',
          text: 'ascii lane',
          wrap: false,
          type: LINETYPE.NOTE,
          placement: PLACEMENT.RIGHTOF,
        },
        {
          id: 'message-2',
          itemId: 'message-2-26',
          from: undefined,
          to: undefined,
          text: 'Divider',
          wrap: false,
          type: LINETYPE.DIVIDER,
        },
      ],
      notes: [],
      participantBoxes: {},
      showSequenceNumbers: false,
      configParams: [],
      overrideConfigs: [],
      params: [],
    } as unknown as SequenceDiagramIR

    const state: SequenceArtistLayoutState = {
      actorAttrsMap: new Map([
        ['User', { x: 0, width: 80 }],
        ['Pintora', { x: 180, width: 90 }],
      ]),
      msgModelMap: new Map([
        [
          'message-0',
          {
            width: 190,
            height: 30,
            startx: 80,
            stopx: 180,
            starty: 50,
            stopy: 80,
            text: 'render this',
            type: LINETYPE.SOLID,
            itemId: 'message-0-0',
            fromBound: 40,
            toBound: 225,
          },
        ],
      ]),
      noteModelMap: new Map([
        [
          'message-1',
          {
            width: 120,
            height: 40,
            startx: 225,
            stopx: 345,
            starty: 96,
            stopy: 136,
            text: 'ascii lane',
          },
        ],
      ]),
      dividerMap: new Map([
        [
          'message-2',
          {
            width: 80,
            height: 20,
            startx: 0,
            stopx: 345,
            starty: 160,
            stopy: 180,
            text: 'Divider',
            type: LINETYPE.DIVIDER,
            itemId: 'message-2-26',
          },
        ],
      ]),
      activations: [],
      loops: [],
    }

    const snapshot = captureSequenceLayoutSnapshot(ir, state)
    const layoutResult = buildSequenceLayoutResult(snapshot)

    expect(snapshot.actors[0]).toMatchObject({ id: 'User', centerX: 40 })
    expect(snapshot.events.map(event => event.kind)).toEqual(['message', 'note', 'divider'])
    expect(layoutResult.events.map(event => event.kind)).toEqual(['message', 'note', 'divider'])
  })

  it('attaches layout and ascii payloads to graphicIR.rendererData.ascii', () => {
    const result = parseAndDraw(
      `
sequenceDiagram
  participant User
  participant Pintora
  User->>Pintora: render this
  note right of Pintora: ascii lane
  == Divider ==
      `,
      { containerSize: { width: 800 } },
    )!

    const graphicIR = result.graphicIR as any
    const layoutResult = graphicIR.rendererData?.ascii?.layout
    expect(layoutResult.actors.map((actor: any) => actor.id)).toEqual(['User', 'Pintora'])
    expect(layoutResult.events.map((event: any) => event.kind)).toEqual(['message', 'note', 'divider'])
    expect(graphicIR.rendererData?.ascii?.sequence.events).toHaveLength(3)
  })
})
```

```ts
// packages/pintora-diagrams/src/sequence/__tests__/sequence-ascii-ir.spec.ts
import { toSequenceAsciiIR } from '../ascii-ir'

describe('toSequenceAsciiIR', () => {
  it('projects layout result into the ASCII-facing contract', () => {
    const asciiIR = toSequenceAsciiIR({
      title: undefined,
      actors: [
        { id: 'User', label: 'User', order: 0 },
        { id: 'Pintora', label: 'Pintora', order: 1 },
      ],
      events: [
        {
          kind: 'message',
          index: 0,
          fromActorId: 'User',
          toActorId: 'Pintora',
          label: 'render this',
          style: 'solid',
          isSelf: false,
        },
      ],
      activations: [],
      spans: [],
    } as any)

    expect(asciiIR.actors).toHaveLength(2)
    expect(asciiIR.events[0]).toMatchObject({
      kind: 'message',
      fromActorId: 'User',
      toActorId: 'Pintora',
      label: 'render this',
    })
  })
})
```

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run: `pnpm exec jest --config packages/pintora-diagrams/jest.config.js packages/pintora-diagrams/src/sequence/__tests__/sequence-layout-result.spec.ts packages/pintora-diagrams/src/sequence/__tests__/sequence-ascii-ir.spec.ts --runInBand`

Expected: FAIL because `captureSequenceLayoutSnapshot`, `buildSequenceLayoutResult`, and `toSequenceAsciiIR` do not exist, and `graphicIR.rendererData.ascii` is still undefined.

- [ ] **Step 3: Define the artist-state snapshot contract and add the snapshot, layout-result, and ASCII-IR adapters**

```ts
// packages/pintora-diagrams/src/sequence/artist/type.ts
import { Message } from '../db'

export type ActivationData = {
  startx: number
  starty: number
  stopx: number
  stopy: number
  actor: string
}

export type LoopModel = {
  startx: number
  stopx: number
  starty: number
  stopy: number
  width: number
  height: number
  title: string
  wrap?: boolean
  sections?: LoopSection[]
  fill?: string | null
}

export type LoopSection = {
  y: number
  width: number
  height: number
  fill: string | undefined
  message: Message
}

export type SequenceDiagramBounds = {
  startx: number
  stopx: number
  starty: number
  stopy: number
}

export type MessageModel = {
  width: number
  height: number
  startx: number
  stopx: number
  starty: number
  stopy: number
  text: Message['text']
  type: Message['type']
  itemId: string
  sequenceIndex?: number
  fromBound?: number
  toBound?: number
}

export type NoteModel = {
  width: number
  height: number
  startx: number
  stopx: number
  starty: number
  stopy: number
  text: Message['text']
}

export type SequenceArtistLayoutState = {
  actorAttrsMap: Map<string, { x: number; width: number }>
  msgModelMap: Map<string, MessageModel>
  noteModelMap: Map<string, NoteModel>
  dividerMap: Map<string, MessageModel>
  activations: ActivationData[]
  loops: LoopModel[]
}
```

```ts
// packages/pintora-diagrams/src/sequence/layout-snapshot.ts
import { LINETYPE, Message, PLACEMENT, SequenceDiagramIR } from './db'
import { SequenceArtistLayoutState } from './artist/type'

type MessageStyle = 'solid' | 'dashed' | 'open' | 'open-dashed'
type NotePlacement = 'left' | 'right' | 'over'

export type SequenceLayoutSnapshot = {
  title?: string
  actors: Array<{
    id: string
    label: string
    classifier?: string
    order: number
    centerX: number
    leftX: number
    rightX: number
  }>
  events: Array<
    | {
        kind: 'message'
        index: number
        fromActorId: string
        toActorId: string
        label: string
        style: MessageStyle
        isSelf: boolean
        bounds: { startX: number; stopX: number; startY: number; stopY: number }
      }
    | {
        kind: 'note'
        index: number
        anchorActorIds: string[]
        placement: NotePlacement
        text: string
        bounds: { startX: number; stopX: number; startY: number; stopY: number }
      }
    | {
        kind: 'divider'
        index: number
        text: string
        bounds: { startX: number; stopX: number; startY: number; stopY: number }
      }
  >
  activations: []
  spans: []
}

function messageStyle(type: LINETYPE | undefined): MessageStyle {
  switch (type) {
    case LINETYPE.DOTTED:
      return 'dashed'
    case LINETYPE.SOLID_OPEN:
      return 'open'
    case LINETYPE.DOTTED_OPEN:
      return 'open-dashed'
    default:
      return 'solid'
  }
}

function notePlacement(value: PLACEMENT | undefined): NotePlacement {
  switch (value) {
    case PLACEMENT.LEFTOF:
      return 'left'
    case PLACEMENT.RIGHTOF:
      return 'right'
    default:
      return 'over'
  }
}

function messageId(msg: Message, index: number) {
  if (msg.id) return msg.id
  throw new Error(`Sequence message at index ${index} is missing an id after layout preparation`)
}

export function captureSequenceLayoutSnapshot(
  ir: SequenceDiagramIR,
  state: SequenceArtistLayoutState,
): SequenceLayoutSnapshot {
  const actors = ir.actorOrder.map((id, order) => {
    const attrs = state.actorAttrsMap.get(id)
    if (!attrs) throw new Error(`Missing actor layout attrs for ${id}`)
    return {
      id,
      label: ir.actors[id].description,
      classifier: ir.actors[id].classifier,
      order,
      centerX: attrs.x + attrs.width / 2,
      leftX: attrs.x,
      rightX: attrs.x + attrs.width,
    }
  })

  const events = ir.messages.flatMap((msg, index) => {
    const id = messageId(msg, index)
    if (msg.type === LINETYPE.NOTE) {
      const note = state.noteModelMap.get(id)
      if (!note) return []
      return [
        {
          kind: 'note' as const,
          index,
          anchorActorIds: Array.isArray(msg.from) ? msg.from : [msg.from, msg.to].filter(Boolean),
          placement: notePlacement(msg.placement),
          text: msg.text,
          bounds: { startX: note.startx, stopX: note.stopx, startY: note.starty, stopY: note.stopy },
        },
      ]
    }
    if (msg.type === LINETYPE.DIVIDER) {
      const divider = state.dividerMap.get(id)
      if (!divider) return []
      return [
        {
          kind: 'divider' as const,
          index,
          text: msg.text,
          bounds: { startX: divider.startx, stopX: divider.stopx, startY: divider.starty, stopY: divider.stopy },
        },
      ]
    }
    const model = state.msgModelMap.get(id)
    if (!model || !msg.from || !msg.to || msg.text == null) return []
    return [
      {
        kind: 'message' as const,
        index,
        fromActorId: msg.from,
        toActorId: msg.to,
        label: msg.text,
        style: messageStyle(msg.type),
        isSelf: msg.from === msg.to,
        bounds: { startX: model.startx, stopX: model.stopx, startY: model.starty, stopY: model.stopy },
      },
    ]
  })

  return {
    title: ir.title || undefined,
    actors,
    events,
    activations: [],
    spans: [],
  }
}
```

```ts
// packages/pintora-diagrams/src/sequence/layout-result.ts
import { SequenceLayoutSnapshot } from './layout-snapshot'

export type SequenceLayoutResult = {
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
    sections?: Array<{ eventIndex: number; label: string }>
  }>
}

export function buildSequenceLayoutResult(snapshot: SequenceLayoutSnapshot): SequenceLayoutResult {
  return {
    title: snapshot.title,
    actors: snapshot.actors.map(actor => ({
      id: actor.id,
      label: actor.label,
      classifier: actor.classifier,
      order: actor.order,
    })),
    events: snapshot.events.map(event => {
      if (event.kind === 'message') {
        return {
          kind: 'message' as const,
          index: event.index,
          fromActorId: event.fromActorId,
          toActorId: event.toActorId,
          label: event.label,
          style: event.style,
          isSelf: event.isSelf,
        }
      }
      if (event.kind === 'note') {
        return {
          kind: 'note' as const,
          index: event.index,
          anchorActorIds: event.anchorActorIds,
          placement: event.placement,
          text: event.text,
        }
      }
      return {
        kind: 'divider' as const,
        index: event.index,
        text: event.text,
      }
    }),
    activations: snapshot.activations,
    spans: snapshot.spans,
  }
}
```

```ts
// packages/pintora-diagrams/src/sequence/ascii-ir.ts
import { SequenceLayoutResult } from './layout-result'

export type SequenceAsciiIR = {
  meta: {
    title?: string
    direction: 'TB'
  }
  actors: Array<{
    id: string
    label: string
    classifier?: string
  }>
  events: SequenceLayoutResult['events']
  spans: SequenceLayoutResult['spans']
}

export function toSequenceAsciiIR(layoutResult: SequenceLayoutResult): SequenceAsciiIR {
  return {
    meta: {
      title: layoutResult.title,
      direction: 'TB',
    },
    actors: layoutResult.actors.map(actor => ({
      id: actor.id,
      label: actor.label,
      classifier: actor.classifier,
    })),
    events: layoutResult.events,
    spans: layoutResult.spans,
  }
}
```

- [ ] **Step 4: Attach the snapshot-derived adapters to `graphicIR.rendererData.ascii`**

```ts
// packages/pintora-diagrams/src/sequence/artist.ts
import { captureSequenceLayoutSnapshot } from './layout-snapshot'
import { buildSequenceLayoutResult } from './layout-result'
import { toSequenceAsciiIR } from './ascii-ir'

// inside customDraw, before `return graphicIR`
const snapshot = captureSequenceLayoutSnapshot(ir, {
  actorAttrsMap: model.actorAttrsMap,
  msgModelMap: model.msgModelMap,
  noteModelMap: model.noteModelMap,
  dividerMap: model.dividerMap,
  activations: model.activations,
  loops: model.loops,
})
const layoutResult = buildSequenceLayoutResult(snapshot)
const sequenceAsciiIR = toSequenceAsciiIR(layoutResult)

graphicIR.rendererData = {
  ...(graphicIR.rendererData || {}),
  ascii: {
    ...(graphicIR.rendererData?.ascii || {}),
    layout: layoutResult,
    sequence: sequenceAsciiIR,
  },
}
```

```ts
// packages/pintora-diagrams/src/sequence/index.ts
export type { SequenceLayoutSnapshot } from './layout-snapshot'
export type { SequenceLayoutResult } from './layout-result'
export type { SequenceAsciiIR } from './ascii-ir'
```

Run: `pnpm exec jest --config packages/pintora-diagrams/jest.config.js packages/pintora-diagrams/src/sequence/__tests__/sequence-layout-result.spec.ts packages/pintora-diagrams/src/sequence/__tests__/sequence-ascii-ir.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the adapters**

```bash
git add \
  packages/pintora-diagrams/src/sequence/layout-snapshot.ts \
  packages/pintora-diagrams/src/sequence/layout-result.ts \
  packages/pintora-diagrams/src/sequence/ascii-ir.ts \
  packages/pintora-diagrams/src/sequence/index.ts \
  packages/pintora-diagrams/src/sequence/artist.ts \
  packages/pintora-diagrams/src/sequence/artist/type.ts \
  packages/pintora-diagrams/src/sequence/__tests__/sequence-layout-result.spec.ts \
  packages/pintora-diagrams/src/sequence/__tests__/sequence-ascii-ir.spec.ts
git commit -m "feat: add sequence layout and ascii adapters"
```

## Task 3: Implement SequenceTextPlan

**Files:**
- Create: `packages/pintora-renderer/src/renderers/ascii/sequence/types.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/sequence/plan.ts`
- Test: `packages/pintora-renderer/src/renderers/ascii/__tests__/sequence-plan.spec.ts`

- [ ] **Step 1: Write the failing planner tests for actor columns, message rows, and note lanes**

```ts
// packages/pintora-renderer/src/renderers/ascii/__tests__/sequence-plan.spec.ts
import { buildSequenceTextPlan } from '../sequence/plan'

const sequenceAsciiIR = {
  meta: { direction: 'TB' },
  actors: [
    { id: 'User', label: 'User' },
    { id: 'Pintora', label: 'Pintora' },
  ],
  events: [
    {
      kind: 'message',
      index: 0,
      fromActorId: 'User',
      toActorId: 'Pintora',
      label: 'render this',
      style: 'solid',
      isSelf: false,
    },
    {
      kind: 'note',
      index: 1,
      anchorActorIds: ['Pintora'],
      placement: 'right',
      text: 'ascii lane',
    },
    {
      kind: 'divider',
      index: 2,
      text: 'Divider',
    },
  ],
  spans: [],
} as const

describe('buildSequenceTextPlan', () => {
  it('allocates actor columns and separates label rows from arrow rows', () => {
    const plan = buildSequenceTextPlan(sequenceAsciiIR)

    expect(plan.columns.map(column => column.actorId)).toEqual(['User', 'Pintora'])
    expect(plan.messages[0].labelRows[0]).toBeLessThan(plan.messages[0].arrowRow)
  })

  it('allocates a right-side note lane and a dedicated divider row', () => {
    const plan = buildSequenceTextPlan(sequenceAsciiIR)

    expect(plan.notes[0].lane).toBe('right')
    expect(plan.rows.some(row => row.kind === 'divider')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the planner tests to verify they fail**

Run: `pnpm exec jest --config packages/pintora-renderer/jest.config.js packages/pintora-renderer/src/renderers/ascii/__tests__/sequence-plan.spec.ts --runInBand`

Expected: FAIL because `buildSequenceTextPlan` and the sequence planning types do not exist.

- [ ] **Step 3: Define the planning types**

```ts
// packages/pintora-renderer/src/renderers/ascii/sequence/types.ts
export type SequenceAsciiRenderData = {
  meta: {
    title?: string
    direction: 'TB'
  }
  actors: Array<{
    id: string
    label: string
    classifier?: string
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
  spans: Array<unknown>
}

export function isSequenceAsciiRenderData(input: unknown): input is SequenceAsciiRenderData {
  if (!input || typeof input !== 'object') return false
  const value = input as SequenceAsciiRenderData
  return Array.isArray(value.actors) && Array.isArray(value.events) && value.meta?.direction === 'TB'
}

export type SequenceTextPlan = {
  source: SequenceAsciiRenderData
  columns: Array<{
    actorId: string
    centerCol: number
    headerLeftCol: number
    headerRightCol: number
    lifelineCol: number
  }>
  rows: Array<{
    kind: 'message-label' | 'message-arrow' | 'self-message' | 'divider' | 'note' | 'block-header'
    startRow: number
    endRow: number
  }>
  messages: Array<{
    eventIndex: number
    fromActorId: string
    toActorId: string
    label: string
    arrowRow: number
    labelRows: number[]
    style: 'solid' | 'dashed' | 'open' | 'open-dashed'
    isSelf: boolean
  }>
  notes: Array<{
    anchorActors: string[]
    lane: 'left' | 'right' | 'over'
    boxCols: [number, number]
    boxRows: [number, number]
  }>
}
```

- [ ] **Step 4: Implement `buildSequenceTextPlan` in the spec’s staged order**

```ts
// packages/pintora-renderer/src/renderers/ascii/sequence/plan.ts
import { SequenceAsciiRenderData, SequenceTextPlan } from './types'

function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
}

export function buildSequenceTextPlan(source: SequenceAsciiRenderData): SequenceTextPlan {
  const columns = source.actors.map((actor, index) => {
    const boxWidth = Math.max(6, widthOf(actor.label) + 4)
    const centerCol = index === 0 ? Math.ceil(boxWidth / 2) : 0
    return {
      actorId: actor.id,
      centerCol,
      headerLeftCol: centerCol - Math.floor(boxWidth / 2),
      headerRightCol: centerCol + Math.ceil(boxWidth / 2),
      lifelineCol: centerCol,
    }
  })

  for (let index = 1; index < columns.length; index++) {
    const prev = columns[index - 1]
    const current = columns[index]
    const gap = Math.max(8, Math.ceil(widthOf(source.actors[index - 1].label) / 2 + widthOf(source.actors[index].label) / 2 + 4))
    current.centerCol = prev.centerCol + gap
    current.headerLeftCol = current.centerCol - Math.floor((current.headerRightCol - current.headerLeftCol) / 2)
    current.headerRightCol = current.headerLeftCol + (current.headerRightCol - current.headerLeftCol)
    current.lifelineCol = current.centerCol
  }

  let cursorRow = 0
  const rows: SequenceTextPlan['rows'] = []
  const messages: SequenceTextPlan['messages'] = []
  const notes: SequenceTextPlan['notes'] = []

  source.events.forEach(event => {
    if (event.kind === 'message') {
      const labelRow = cursorRow
      const arrowRow = cursorRow + 1
      messages.push({
        eventIndex: event.index,
        fromActorId: event.fromActorId,
        toActorId: event.toActorId,
        label: event.label,
        arrowRow,
        labelRows: [labelRow],
        style: event.style,
        isSelf: event.isSelf,
      })
      rows.push({ kind: event.isSelf ? 'self-message' : 'message-label', startRow: labelRow, endRow: labelRow })
      rows.push({ kind: event.isSelf ? 'self-message' : 'message-arrow', startRow: arrowRow, endRow: arrowRow })
      cursorRow += event.isSelf ? 4 : 3
      return
    }
    if (event.kind === 'note') {
      notes.push({
        anchorActors: event.anchorActorIds,
        lane: event.placement,
        boxCols: [0, Math.max(8, widthOf(event.text) + 4)],
        boxRows: [cursorRow, cursorRow + 2],
      })
      rows.push({ kind: 'note', startRow: cursorRow, endRow: cursorRow + 2 })
      cursorRow += 4
      return
    }
    rows.push({ kind: 'divider', startRow: cursorRow, endRow: cursorRow })
    cursorRow += 2
  })

  return {
    source,
    columns,
    rows,
    messages,
    notes,
  }
}
```

Run: `pnpm exec jest --config packages/pintora-renderer/jest.config.js packages/pintora-renderer/src/renderers/ascii/__tests__/sequence-plan.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the planner**

```bash
git add \
  packages/pintora-renderer/src/renderers/ascii/sequence/types.ts \
  packages/pintora-renderer/src/renderers/ascii/sequence/plan.ts \
  packages/pintora-renderer/src/renderers/ascii/__tests__/sequence-plan.spec.ts
git commit -m "feat: add sequence ascii planning"
```

## Task 4: Implement SequenceAsciiRenderer Output

**Files:**
- Create: `packages/pintora-renderer/src/renderers/ascii/sequence/text-canvas.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/sequence/render.ts`
- Modify: `packages/pintora-renderer/src/renderers/AsciiRenderer.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/__tests__/test-helpers.ts`
- Create: `packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts`

- [ ] **Step 1: Write the failing end-to-end sequence ASCII cases**

```ts
// packages/pintora-renderer/src/renderers/ascii/__tests__/test-helpers.ts
import { parseAndDraw, diagramRegistry } from '@pintora/core'
import { DIAGRAMS } from '@pintora/diagrams'
import { render } from '../../../index'

Object.keys(DIAGRAMS).forEach(name => {
  diagramRegistry.registerDiagram(name, DIAGRAMS[name as keyof typeof DIAGRAMS])
})

export function renderToAscii(code: string) {
  const container = document.createElement('div')
  const drawResult = parseAndDraw(code, { containerSize: { width: 800 } })
  if (!drawResult) throw new Error('Failed to parse and draw diagram')

  let text = ''
  render(drawResult.graphicIR, {
    container,
    renderer: 'ascii' as any,
    onRender(renderer) {
      text = (renderer as any).getTextContent?.() || ''
    },
  })
  return text
}
```

```ts
// packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts
import { renderToAscii } from './test-helpers'

describe('sequence ascii rendering', () => {
  it('renders base messages with compact arrows', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant User
  participant Pintora
  User->>Pintora: render this
    `)

    expect(text.replace(/\s/g, '')).toContain('▶')
    expect(text).toContain('render this')
  })

  it('renders self messages, notes, and dividers from templates', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant User
  User->>User: retry
  note right of User: ascii lane
  == Divider ==
    `)

    expect(text).toContain('retry')
    expect(text).toContain('┐')
    expect(text).toContain('┘')
    expect(text).toContain('ascii lane')
    expect(text).toContain('Divider')
  })

  it('keeps CJK labels intact', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant 张三
  participant 李四
  张三-->>李四: 你好
    `)

    expect(text).toContain('张三')
    expect(text).toContain('李四')
    expect(text).toContain('你好')
  })
})
```

- [ ] **Step 2: Run the end-to-end sequence tests to verify they fail**

Run: `pnpm exec jest --config packages/pintora-renderer/jest.config.js packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts --runInBand`

Expected: FAIL because `AsciiRenderer` still returns the placeholder string.

- [ ] **Step 3: Add a small text canvas and the phase-1 sequence renderer**

```ts
// packages/pintora-renderer/src/renderers/ascii/sequence/text-canvas.ts
export function makeCanvas(width: number, height: number) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => ' '))
}

export function put(canvas: string[][], x: number, y: number, ch: string) {
  if (y < 0 || y >= canvas.length) return
  if (x < 0 || x >= canvas[y].length) return
  canvas[y][x] = ch
}

export function putText(canvas: string[][], x: number, y: number, text: string) {
  Array.from(text).forEach((ch, index) => put(canvas, x + index, y, ch))
}

export function canvasToString(canvas: string[][]) {
  return canvas.map(row => row.join('').replace(/\s+$/g, '')).join('\n')
}
```

```ts
// packages/pintora-renderer/src/renderers/ascii/sequence/render.ts
import { buildSequenceTextPlan } from './plan'
import { canvasToString, makeCanvas, put, putText } from './text-canvas'
import { SequenceAsciiRenderData } from './types'

export function renderSequenceAscii(source: SequenceAsciiRenderData) {
  const plan = buildSequenceTextPlan(source)
  const width = Math.max(40, ...plan.columns.map(column => column.headerRightCol + 10))
  const height = Math.max(10, ...plan.rows.map(row => row.endRow + 6))
  const canvas = makeCanvas(width, height)

  plan.columns.forEach(column => {
    put(canvas, column.headerLeftCol, 0, '┌')
    put(canvas, column.headerRightCol, 0, '┐')
    for (let x = column.headerLeftCol + 1; x < column.headerRightCol; x++) put(canvas, x, 0, '─')
    put(canvas, column.headerLeftCol, 1, '│')
    put(canvas, column.headerRightCol, 1, '│')
    put(canvas, column.headerLeftCol, 2, '└')
    put(canvas, column.headerRightCol, 2, '┘')
    for (let x = column.headerLeftCol + 1; x < column.headerRightCol; x++) put(canvas, x, 2, '─')
    const label = source.actors.find(actor => actor.id === column.actorId)?.label || column.actorId
    putText(canvas, column.centerCol - Math.floor(label.length / 2), 1, label)
  })

  plan.messages.forEach(message => {
    const from = plan.columns.find(column => column.actorId === message.fromActorId)!
    const to = plan.columns.find(column => column.actorId === message.toActorId)!
    putText(canvas, Math.min(from.centerCol, to.centerCol), message.labelRows[0] + 4, message.label)
    if (message.isSelf) {
      put(canvas, from.centerCol + 4, message.arrowRow + 4, '┐')
      put(canvas, from.centerCol + 4, message.arrowRow + 5, '│')
      put(canvas, from.centerCol + 4, message.arrowRow + 6, '┘')
      put(canvas, from.centerCol, message.arrowRow + 6, '◀')
      return
    }
    for (let x = from.centerCol + 1; x < to.centerCol; x++) put(canvas, x, message.arrowRow + 4, message.style === 'dashed' || message.style === 'open-dashed' ? '╌' : '─')
    put(canvas, to.centerCol, message.arrowRow + 4, message.style === 'open' || message.style === 'open-dashed' ? '▷' : '▶')
  })

  source.events.forEach((event, index) => {
    if (event.kind === 'note') {
      const row = plan.rows.filter(row => row.kind === 'note')[0].startRow + 4 + index
      putText(canvas, width - event.text.length - 6, row, `┌ ${event.text} ┐`)
      putText(canvas, width - event.text.length - 6, row + 1, `└${'─'.repeat(event.text.length + 2)}┘`)
    }
    if (event.kind === 'divider') {
      const row = plan.rows.find(row => row.kind === 'divider')!.startRow + 4
      putText(canvas, Math.max(0, Math.floor((width - event.text.length - 4) / 2)), row, `│ ${event.text} │`)
    }
  })

  return canvasToString(canvas)
}
```

- [ ] **Step 4: Replace the placeholder renderer output with real sequence rendering and verify the tests pass**

```ts
// packages/pintora-renderer/src/renderers/AsciiRenderer.ts
import { isSequenceAsciiRenderData } from './ascii/sequence/types'
import { renderSequenceAscii } from './ascii/sequence/render'

render() {
  const sequence = this.ir.rendererData?.ascii?.sequence
  this.textContent = isSequenceAsciiRenderData(sequence) ? renderSequenceAscii(sequence) : ''
  const root = this.getRootElement()
  root.textContent = this.textContent
  if (this.container) {
    this.container.innerHTML = ''
    this.container.appendChild(root)
  }
}
```

Run: `pnpm exec jest --config packages/pintora-renderer/jest.config.js packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit the renderer**

```bash
git add \
  packages/pintora-renderer/src/renderers/AsciiRenderer.ts \
  packages/pintora-renderer/src/renderers/ascii/sequence/text-canvas.ts \
  packages/pintora-renderer/src/renderers/ascii/sequence/render.ts \
  packages/pintora-renderer/src/renderers/ascii/__tests__/test-helpers.ts \
  packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts
git commit -m "feat: render sequence ascii output"
```

## Task 5: Verify The Phase-1 Vertical Slice End To End

**Files:**
- Modify: `packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts`
- Modify: `packages/pintora-diagrams/src/sequence/__tests__/sequence-layout-result.spec.ts`
- Modify: `packages/pintora-diagrams/src/sequence/__tests__/sequence-ascii-ir.spec.ts`

- [ ] **Step 1: Extend coverage for dashed, open, and open-dashed arrows**

```ts
// packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts
it('renders dashed, open, and open-dashed arrows', () => {
  const text = renderToAscii(`
sequenceDiagram
  A-->>B: dashed
  B-)A: open
  A--)B: open dashed
    `)

  const compact = text.replace(/\s/g, '')
  expect(compact).toContain('▷')
  expect(compact).toContain('╌')
})
```

- [ ] **Step 2: Run the focused verification suite**

Run: `pnpm exec jest --config packages/pintora-renderer/jest.config.js packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer.spec.ts packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts packages/pintora-renderer/src/renderers/ascii/__tests__/sequence-plan.spec.ts --runInBand`

Expected: PASS

- [ ] **Step 3: Run the sequence-diagram adapter tests and compile the renderer package**

Run: `pnpm exec jest --config packages/pintora-diagrams/jest.config.js packages/pintora-diagrams/src/sequence/__tests__/sequence-layout-result.spec.ts packages/pintora-diagrams/src/sequence/__tests__/sequence-ascii-ir.spec.ts --runInBand && pnpm exec tsc -p packages/pintora-renderer/tsconfig.json`

Expected: All adapter tests pass, then TypeScript compile succeeds.

- [ ] **Step 4: Run the repository-level Jest matrix**

Run: `pnpm exec jest --runInBand`

Expected: Root Jest run includes `@pintora/renderer` and remains green.

- [ ] **Step 5: Commit the verification and regression coverage**

```bash
git add \
  packages/pintora-renderer/src/renderers/ascii/__tests__/ascii-renderer-cases.spec.ts \
  packages/pintora-diagrams/src/sequence/__tests__/sequence-layout-result.spec.ts \
  packages/pintora-diagrams/src/sequence/__tests__/sequence-ascii-ir.spec.ts \
  jest.config.js
git commit -m "test: verify sequence ascii phase 1"
```
