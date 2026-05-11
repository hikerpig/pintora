# Diagram Three-Piece Pattern

Every diagram type in `@pintora/diagrams` ships as four co-located files:

- `parser.ts` — nearley artifact compiled from `parser.ne`.
- `artist.ts` — IR → Mark tree, plus layout.
- `config.ts` — default config object and the `configKey` constant.
- `index.ts` — calls `pintora.registerDiagram(name, { parser, artist, configKey })`.

## Standard directory layout

```
packages/pintora-diagrams/src/<type>/
├── index.ts
├── parser.ts        # compiled artifact, do not edit by hand
├── parser.ne        # nearley source
├── artist.ts
├── config.ts
├── type.ts          # IR and Mark types specific to this diagram
└── util.ts          # local helpers (optional)
```

## `parser.ts`

- Generated from `parser.ne`. After editing the grammar, run:

```bash
pnpm --filter @pintora/diagrams build:grammar
```

- The compiled `parser.ts` is committed; reviewers diff both files.

## `artist.ts`

- Translates parser output into a Mark tree.
- Lays out using D3 (`d3-hierarchy`, `d3-shape`) or custom algorithms.
- Reads colors via `getConfig().themeConfig`. Do not hard-code hex values.
- Uses relative coordinates. Do not bake in pixel offsets.

## `config.ts`

- Exports `DEFAULT_CONFIG`, `configKey`, and the per-diagram config type.
- New fields require updates in `@pintora/core`'s theme definitions and in every other diagram that shares the field.

## `index.ts`

```typescript
import { pintora } from '@pintora/core'
import parser from './parser'
import artist from './artist'
import { DEFAULT_CONFIG, configKey } from './config'

pintora.registerDiagram('myDiagram', {
  parser,
  artist,
  configKey,
})
```

## Reference implementations

- Minimal: `packages/pintora-diagrams/src/mindmap/`
- Full-featured: `packages/pintora-diagrams/src/sequence/`
- Flow-style layout: `packages/pintora-diagrams/src/activity/`

## Adding a new diagram

Follow the full step-by-step in [`.ai/skills/add-new-diagram/SKILL.md`](../../skills/add-new-diagram/SKILL.md).
