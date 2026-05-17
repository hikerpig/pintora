# @pintora/diagrams — Agent Notes

**Role:** All diagram implementations. Each diagram type is the parser + artist + config + index four-file convention.

## Entry points

- `src/index.ts` — registers every diagram with `@pintora/core`.
- Per-diagram entry: `src/<type>/index.ts`.

## Internal layout

| Path             | Responsibility                               |
| ---------------- | -------------------------------------------- |
| `src/sequence/`  | Sequence diagram                             |
| `src/er/`        | Entity-relationship diagram                  |
| `src/component/` | Component diagram                            |
| `src/activity/`  | Activity diagram                             |
| `src/mindmap/`   | Mind map                                     |
| `src/gantt/`     | Gantt diagram                                |
| `src/dot/`       | DOT diagram                                  |
| `src/class/`     | Class diagram                                |
| `src/usecase/`   | Use-case diagram                             |
| `src/util/`      | Cross-diagram helpers (layout, text, shape). |
| `src/__tests__/` | Integration snapshot tests.                  |

## ASCII text plans

When emitting `rendererData.ascii.plan`, follow
[`../../.ai/docs/ascii-text-plan-authoring.md`](../../.ai/docs/ascii-text-plan-authoring.md).
Use shared helpers from `src/util/text-diagram.ts` instead of duplicating text
measurement, op builders, route snapping, or route drawing inside individual
diagrams.

## Conventions (the diagram triple)

- `parser.ts` — nearley artifact compiled from `parser.ne`. Rebuild via `pnpm --filter @pintora/diagrams gen-parser` after grammar edits.
- `artist.ts` — translate parser AST into a Mark tree; layout happens here.
- `config.ts` — default config and `configKey`.
- `index.ts` — calls `pintora.registerDiagram(name, { parser, artist, configKey })`.

See [`.ai/docs/patterns/diagram-three-piece.md`](../../.ai/docs/patterns/diagram-three-piece.md) for the full pattern.

## Depends on

- `@pintora/core` — registry, theme, config.
- D3 (layout), jsdom (test environment).

## Tested how

- jsdom environment (D3 requires DOM).
- Snapshot tests in `src/__tests__/<type>.spec.ts`.
- Snapshot diffs always require human review.

## Gotchas

- Adding a diagram has many steps; follow [`.ai/skills/add-new-diagram/SKILL.md`](../../.ai/skills/add-new-diagram/SKILL.md).
- After grammar edits, rebuild before running tests or the parser is stale.
- Use relative coordinates in Marks; do not hard-code pixels.
- Read colors from `getConfig().themeConfig`; do not hard-code.
