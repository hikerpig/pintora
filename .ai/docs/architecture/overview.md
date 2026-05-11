# Architecture Overview

## Data flow

```
text (DSL)
   │  parser (nearley)
   ▼
IR / AST
   │  artist
   ▼
Mark tree (draw instructions)
   │  renderer
   ▼
SVG / Canvas / PNG
```

## Package graph

- `@pintora/core` — interfaces, theme, config, diagram registry.
- `@pintora/diagrams` — depends on core; registers every diagram type.
- `@pintora/renderer` — consumes the Mark tree; produces SVG or Canvas output.
- `@pintora/standalone` — aggregates the three above plus a parse entry point.
- `@pintora/cli` — Node command-line wrapper.
- `@pintora/target-wintercg` — WinterCG-compatible build target.
- `development-kit` and `test-shared` — internal tooling.

## Key extension points

- `pintora.registerDiagram(name, { parser, artist, configKey })` — add a new diagram.
- `getConfig().themeConfig` — read theme tokens (do not hard-code colors).
- Mark types — see `@pintora/core/src/type.ts`.

## See also

- [Three-piece diagram pattern](../patterns/diagram-three-piece.md)
- [Glossary](../glossary.md)
