# @pintora/core — Agent Notes

**Role:** Registry, theme, and config. Every diagram must register here.

## Entry points

- `src/index.ts` — public exports and the `pintora` singleton.
- `src/config.ts` — global config and `getConfig`.
- `src/themes/` — theme definitions (`default`, `dark`, etc.).
- The diagram registry lives in this package; check `src/index.ts` for the `registerDiagram` re-export and follow it to the implementation.

## Internal layout

| Path | Responsibility |
|------|----------------|
| `src/index.ts` | Public exports and the `pintora` singleton. |
| `src/config.ts` | Merge global config with per-diagram config via `safeAssign`. |
| `src/themes/` | Theme definitions; `theme-default.ts` declares the canonical fields. |
| `src/util/` | Shared helpers (color, geometry). |
| `src/type.ts` | Public types such as `IDiagram` and `IDiagramArtist`. |

## Conventions

- Do not change the shape of `IDiagram<T>` without auditing all diagrams in `@pintora/diagrams`.
- Config merge goes through `safeAssign`. Do not overwrite branches directly.
- Theme fields are declared in `src/themes/theme-default.ts`. Adding a field requires updating every other theme.

## Depends on

- No internal package dependencies (core sits at the base of the graph).
- Runtime relies on `nearley` types; grammar files themselves live in `@pintora/diagrams`.

## Tested how

- `pnpm --filter @pintora/core test`
- Focus areas: config merge and registry lookup.

## Gotchas

- Adding a config field cascades: themes, `type.ts`, every per-diagram `config.ts`.
- Color and border semantics are unified across diagrams; see [`.ai/docs/glossary.md`](../../.ai/docs/glossary.md).
- See also: [`.ai/docs/architecture/overview.md`](../../.ai/docs/architecture/overview.md).
