---
name: add-new-diagram
description: Use when adding a new diagram type to Pintora. Covers parser, artist, config, registration, snapshot tests, and user docs.
triggers: "add diagram, new diagram type, register diagram, parser artist config"
---

# Add a New Diagram Type

## Preconditions

- `pnpm install` succeeds locally and the workspace builds.
- You have read:
  - `packages/pintora-diagrams/AGENTS.md`
  - `.ai/docs/patterns/diagram-three-piece.md`

## Steps

### 1. Create the directory

```bash
mkdir -p packages/pintora-diagrams/src/<type>
```

### 2. Write the grammar

Create `packages/pintora-diagrams/src/<type>/parser.ne`. Use `packages/pintora-diagrams/src/sequence/parser.ne` as a reference.

### 3. Compile the grammar

```bash
pnpm --filter @pintora/diagrams build:grammar
```

This produces `parser.ts` alongside `parser.ne`. Commit both.

### 4. Write the artist

Create `packages/pintora-diagrams/src/<type>/artist.ts`. Use `packages/pintora-diagrams/src/mindmap/artist.ts` as a minimal reference or `packages/pintora-diagrams/src/sequence/artist.ts` as a full-featured one.

Rules:

- Read colors from `getConfig().themeConfig`. Never hard-code hex values.
- Emit relative coordinates. Avoid baked-in pixel offsets.

### 5. Write the config

Create `packages/pintora-diagrams/src/<type>/config.ts` exporting `DEFAULT_CONFIG`, `configKey`, and the config type. If new theme tokens are introduced, also update `packages/pintora-core/src/themes/default.ts` and any other theme variants.

### 6. Register the diagram

Create `packages/pintora-diagrams/src/<type>/index.ts`:

```typescript
import { pintora } from '@pintora/core'
import parser from './parser'
import artist from './artist'
import { DEFAULT_CONFIG, configKey } from './config'

pintora.registerDiagram('<type>', {
  parser,
  artist,
  configKey,
})
```

Re-export from `packages/pintora-diagrams/src/index.ts` (and from `packages/pintora-standalone/src/index.ts` if standalone needs to ship it).

### 7. Add a snapshot test

Create `packages/pintora-diagrams/src/__tests__/<type>.spec.ts` modelled on the existing per-diagram spec files in that directory.

Run the suite:

```bash
pnpm --filter @pintora/diagrams test -- <type>
```

Review the generated snapshot manually before committing it.

### 8. Add user documentation

Create `website/docs/diagrams/<type>.mdx` following the structure of `website/docs/diagrams/sequence-diagram.mdx`. Add a note at the top linking back to this skill for contributors.

### 9. Verify in the live editor

```bash
pnpm demo:dev
```

Open the demo, pick the new diagram type, and confirm it renders.

## Done criteria

- `pnpm --filter @pintora/diagrams test` passes and snapshots are committed after manual review.
- `pnpm compile` succeeds for all packages.
- `pnpm ai:lint` reports no new warnings.
- Live editor renders the new diagram.

## Common pitfalls

- Forgetting to rebuild grammar after editing `parser.ne` — symptoms are stale parser errors.
- Hard-coding theme colors — breaks dark mode.
- Skipping the standalone re-export — the diagram works in tests but not in the standalone bundle.
- Adding a config field without updating other themes — the field is `undefined` outside the default theme.
