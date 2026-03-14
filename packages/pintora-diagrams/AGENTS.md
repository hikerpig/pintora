# pintora-diagrams Directory Summary

## 1. Directory Positioning

`packages/pintora-diagrams` is the package responsible for implementing various diagram types in Pintora, carrying the core responsibility of "Text DSL -> Diagram IR -> Rendering Marks".
Supported diagram types: `sequence`, `er`, `component`, `activity`, `mindmap`, `gantt`, `dot`, `class`.

## 2. Main Directory Structure

- `src/index.ts`: Unified export of all diagram modules (`DIAGRAMS`).
- `src/{diagram}/`: Each diagram has an independent module directory, typically containing:
  - `index.ts`: Diagram registration entry (`IDiagram`)
  - `parser.ts`: Syntax parsing entry
  - `db.ts`: Parsing state and IR aggregation
  - `artist.ts`: IR -> GraphicsIR rendering
  - `config.ts`: Diagram configuration definition and merging
  - `__tests__/`: Unit tests and snapshots for that diagram
- `src/util/`: Cross-diagram common capabilities
  - `base-db.ts`, `base-artist.ts`
  - `parser-util.ts`
  - `preproccesor/` (preprocessor)
  - `style-engine/` (style rules)
  - Other rendering and layout utilities
- `shared-grammars/`: Shared nearley grammar fragments (e.g., config/style/comment/bind).
- `scripts/build-grammar.js`: Compiles `.ne` grammar into TypeScript parser.
- `jest.config.js`: Test configuration for this package (`jsdom` environment).

## 3. Common Implementation Patterns and Concepts Across Diagrams

### 3.1 Unified Diagram Registration Protocol

Each diagram exports `IDiagram` in `src/{diagram}/index.ts` with a consistent structure:

- `pattern`: Recognizes DSL header (e.g., `^\s*sequenceDiagram`)
- `parser`: Parser (mostly `ParserWithPreprocessor`)
- `artist`: Renderer
- `configKey`: Corresponding global configuration key

### 3.2 Unified Parsing Pipeline

The overall pipeline is typically:

1. Preprocessing (title, config, style, bind class)
2. nearley main grammar parsing
3. `db.apply(...)` action aggregation
4. `db.getDiagramIR()` produces IR

Where:

- `ParserWithPreprocessor` handles pre-content processing and injection;
- `genParserWithRules` encapsulates nearley parser initialization, EOF completion, ambiguity deduplication, and post-processing.

### 3.3 Unified State Model (DB) and IR Base Fields

Each diagram's db mostly inherits from `BaseDb`, sharing base fields.

Finally, in each diagram's `getDiagramIR()`, diagram-specific structures are merged to form the complete Diagram IR.

### 3.4 Unified Styling Mechanism

- Grammar layer generates style actions via `style` / `bindClass`;
- db stores `styleRules` and `bindRules`;
- `BaseArtist.draw` calls `styleEngine.apply(...)` after drawing graphics, applying styles to marks by `class/id`.

### 3.5 Unified Configuration Merging Strategy

`makeConfigurator` handles merging:

- Default configuration
- Theme configuration
- Global configuration (`pintora config`)
- Parameter directives (`configParams`)
- Override configuration

And outputs enhanced configuration (including `themeConfig`).

### 3.6 Interactive Event Recognition (Some Diagrams)

For example, `sequence` and `er` provide `eventRecognizer`, which traces back to business objects (actor/entity/message/relationship) through mark's `itemId` rules.

## 4. Common Test Scripts

### 4.1 Within `packages/pintora-diagrams`

- `pnpm test`: Run Jest tests for this package
- `pnpm compile`: TypeScript compilation
