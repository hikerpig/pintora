# Glossary

| Term | Meaning |
|------|---------|
| IR | Parser output handed to the artist (also called the AST). |
| Mark | A single renderer draw instruction. |
| Mark tree | Nested Marks passed to the renderer. |
| Artist | Component that turns IR into a Mark tree and performs layout. |
| Parser | Nearley-based DSL parser, compiled from `.ne` grammar files. |
| ConfigKey | A diagram's namespace inside the global config. |
| themeConfig | Theme tokens (color, border, font size) read via `getConfig().themeConfig`. |
| registerDiagram | Core entry binding `name → { parser, artist, configKey }`. |
| Standalone | Aggregate package usable directly in browser or Node. |
| Three-piece diagram | The `parser.ts` + `artist.ts` + `config.ts` + `index.ts` convention used by every diagram in `@pintora/diagrams`. |
