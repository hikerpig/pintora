# Pintora ASCII/Unicode Text Renderer Requirements

## 1. Problem & Background

### 1.1 Current Issues
- **Rough Implementation**: The current `AsciiRenderer` implementation is crude and cannot stably output readable Unicode/ASCII plain text.
- **Lack of Regression Test Baseline**: No stable rendering baseline exists, making regression testing difficult.
- **Incomplete Diagram Type Coverage**: Needs to support basic usability across all diagram types (sequence/er/component/activity/mindmap/gantt/dot/class).

### 1.2 Core Challenges
- **Path/Curve Handling Complexity**: Need to discretize SVG paths (including Bezier curves, arcs, etc.) into line segments.
- **Character Conflict Resolution**: Line intersection points (junctions) require intelligent character merging (e.g., `─` + `│` → `┼`).
- **CJK Wide Character Alignment**: Chinese and other wide characters display with width 2 in monospace fonts, requiring special handling to ensure text alignment.
- **Geometric Dimensionality Reduction Distortion**: Converting 2D graphics to character grids inevitably involves precision loss, requiring controllable degradation strategies.

### 1.3 Text Layout Alignment Problem
A specific class of rendering failures occurred in sequence diagrams and class diagrams where centered or middle-aligned labels overlapped with their container borders or divider lines:

**Sequence Diagram Example:**
```text
sequenceDiagram
  User->>Pintora: render this
  == Divider ==
```

Issues:
- Actor labels were placed on the same grid row as horizontal borders
- Divider text overlapped with separator lines
- Class member text pierced horizontal border lines

**Root Cause**: The initial approach computed text placement in pixel space, then rounded to grid coordinates. This caused center/middle-aligned text to snap onto border rows when the geometry was tight.

**Solution Direction**: Move to a renderer-centric normalization approach where:
1. Text anchor placement is resolved from `textAlign`/`textBaseline` semantics
2. Placement is computed directly in grid space (rows/cols)
3. Semantic metadata (container, separator, backdrop) guides placement constraints

---

## 2. Design Goals

### 2.1 Overall Objective
Rewrite `AsciiRenderer` based on `GraphicsIR` to provide stable Unicode/ASCII plain text rendering and a regression-testable baseline.

### 2.2 Design Principles
1. **Diagram-Agnostic**: Not dependent on specific diagram semantics; achieve full diagram coverage through generic `GraphicsIR`.
2. **Non-Intrusive**: `svg`/`canvas` rendering paths remain unchanged.
3. **Structure-Readability First**: First version prioritizes "structural readability and text correctness" over pixel-perfect geometric consistency with SVG.
4. **Semantic-Driven**: Express rendering intent through mark-level semantics rather than class names or color heuristics.

---

## 3. Architecture Design

### 3.1 Core Pipeline
Adopt a **layered pipeline** architecture:

```
Graphics IR → IR Normalization → Path Flattening → Grid Rasterization → Layer Composition → Text Output
```

### 3.2 Key Components

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **TextGrid** | 2D character buffer + layer priority buffer | `grid.ts` - `TextGrid` class |
| **GlyphResolver** | Select Unicode box-drawing characters (`─│┌┐└┘├┤┬┴┼`) based on adjacency direction bitmask; use `/\` for diagonals | `glyph.ts` - `resolveLineGlyph()`, `mergeGlyph()` functions |
| **PathFlattener** | Discretize `path` (array/string) into line segment collections; sample curves/arcs with adaptive step intervals | `path-flattener.ts` - `flattenPath()` function |
| **TextPlacer** | Place text according to `textAlign`/`textBaseline`, handling CJK wide character widths | `text-layout.ts` - `resolveTextPlacement()` function |
| **MarkWalker** | Traverse `GraphicsIR`, normalize various Marks (rect/line/poly/path/text/group) into standard draw operations | `mark-walker.ts` - `collectDrawOps()` function |
| **Normalizer** | Normalize text placement to avoid separator lines, clamp text inside containers | `normalize-ops.ts` - `normalizeDrawOps()` function |
| **TextMetrics** | Calculate text dimensions and line breaks for ASCII grid | `text-metrics.ts` - `measureAsciiText()` function |

### 3.3 Rendering Order (Layer Priority)
Fixed layer ordering to avoid accidental overwrites:
1. **Background/Fill** (layer 1)
2. **Borders/Lines** (layer 2)
3. **Arrows/Markers** (layer 3) - *reserved for future use*
4. **Text** (layer 4, highest priority)

### 3.4 Three-Layer Rendering Contract

The renderer is intentionally split into three layers to separate concerns:

#### 1. Artist Layer
Emits geometry plus semantic intent. Marks declare whether they are:
- Real borders (strokes that should appear in all renderers)
- Decorative underlines (can be omitted in low-fidelity renderers)
- Text backdrops (clear lower content, provide contrast)
- Containers (define inner content areas with border boundaries)

#### 2. Normalization Layer
Preserves semantic intent into renderer-facing operations instead of flattening everything into generic lines too early.

Responsibilities:
- **Separator Snapping**: Align separator segments to stable grid rows/cols
- **Text Anchor Resolution**: Convert `textAlign`/`textBaseline` to final pixel top-left and snapped grid position
- **Container Clamping**: Keep text placement inside container inner bounds

Location: `packages/pintora-renderer/src/renderers/ascii/normalize-ops.ts`

#### 3. Rasterization Layer
Applies renderer-specific fidelity rules:
- Whether a backdrop clears lower content (`occludesBelow`)
- Whether an optional stroke is visible in ASCII (`strokePolicy`)
- How text anchor semantics snap to the character grid

This separation is critical because earlier renderer-only fixes failed by mixing semantic interpretation and final draw-time collision avoidance together.

---

## 4. Key Features

### 4.1 Character Set Support
- **Unicode Box-Drawing** (default): Use Unicode box-drawing characters like `─│┌┐└┘├┤┬┴┼`
- **Strict ASCII** (configurable fallback): Use ASCII characters like `-|+/`

### 4.2 Coordinate & Grid Mapping
- **Pixel to Character Grid**: `col = round(x / cellWidth)`, `row = round(y / cellHeight)`
- **Default Parameters**:
  - `cellWidth`: 8
  - `cellHeight`: 16
  - `charset`: 'unicode'
  - `trimRight`: true
  - `ansi`: false (v1 only supports false)

### 4.3 Mark Semantic Support
The renderer respects `MarkSemantic` annotations from `GraphicsIR`:

```typescript
type MarkSemanticRole = 'container' | 'backdrop' | 'separator' | 'decoration'
type MarkStrokePolicy = 'always' | 'optional' | 'none'

interface MarkSemantic {
  role?: MarkSemanticRole
  occludesBelow?: boolean  // Clears lower-layer content (for backdrop)
  strokePolicy?: MarkStrokePolicy  // Controls stroke rendering
}
```

#### Semantic Roles

| Role | Description | Current Usage |
|------|-------------|---------------|
| **container** | Defines an area with inner content and outer border | Class entity outer rect |
| **backdrop** | Background area that may occlude content below | Label backgrounds, section backgrounds, divider label boxes |
| **separator** | Horizontal/vertical dividing line | Class section separators |
| **decoration** | Visual accent that can be omitted in low-fidelity | Static member underlines |

#### Semantic Behaviors

- **container**: Text placement is clamped inside container boundaries (inner rows/cols)
- **backdrop**: Clears content below when `occludesBelow: true`
- **separator**: Horizontal lines that text should avoid overlapping; snapped to stable grid positions
- **strokePolicy**: 
  - `'none'` or `'optional'` strokes are skipped in ASCII output
  - `'always'` strokes are preserved even in low-fidelity renderers

### 4.4 Pre-Rasterization Normalization

To reduce post-layout patching, ASCII applies semantic-aware normalization before glyph writes:

1. **Separator Snapping**: `separator` segments are aligned to stable grid rows/cols to prevent drift
2. **Text Anchor Resolution**: Derive final grid position from `textAlign`/`textBaseline` semantics
3. **Container Clamping**: Restrict text placement to inner bounds of `container` rects
4. **Separator Avoidance**: Move text off rows occupied by separators when possible

This keeps rules generic and semantic-driven instead of class-name driven.

### 4.5 Degradation Strategy
- Complex Bezier curves, cloud shapes, and other non-exactly-reproducible shapes: approximate with discrete line segments
- If discretization fails: fall back to bounding box outline while preserving text

### 4.6 CJK Wide Character Support
- Use `wcwidth`-like logic for CJK wide characters (display width = 2)
- Ensure mixed Chinese/English text alignment without label drift

---

## 5. API & Configuration

### 5.1 Public API Changes

| Location | Change |
|----------|--------|
| `RendererType` | Extended to `'svg' \| 'canvas' \| 'ascii'` |
| `IRenderer` | Added optional method `getTextContent?(): string` |
| `AsciiRenderer` | Returns `<pre>` root element; text retrieved via `getTextContent()` |

### 5.2 Configuration Entry (PintoraConfig)

```typescript
core: {
  textRenderer: {
    charset: 'unicode' | 'ascii'     // default 'unicode'
    cellWidth: number                // default 8
    cellHeight: number               // default 16
    trimRight: boolean               // default true
    ansi: boolean                    // default false
  }
}
```

### 5.3 CLI Support
- Output extension `.txt` automatically selects `renderer: 'ascii'`
- New MIME type `text/plain`
- Writes `renderer.getTextContent()` result

---

## 6. Testing Strategy

### 6.1 Unit Test Coverage
- **Character Mapping**: Correct line adjacency character mapping (cross, T-junction, corner)
- **Wide Character Alignment**: `wcwidth` wide character alignment correct (mixed Chinese/English labels don't drift)
- **Path Flattening**: Minimum viable coverage for `M/L/A/C/Q/Z` path commands
- **Grid Rasterization**: Corners, cross intersections, diagonals, text overlay priority

### 6.2 Integration Testing
- `renderTo(..., { renderer: 'ascii' })` generates `<pre>` and `getTextContent()` is non-empty
- Multi-diagram sample snapshot regression (stable snapshots via fixed `cellWidth`/`cellHeight`)

### 6.3 Golden File Regression
- Use standardized whitespace handling to reduce regression costs
- ASCII/Unicode dual modes share same test cases for quick character mapping regression detection

### 6.4 E2E Testing
- **standalone**: ASCII rendering outputs correctly
- **CLI**: `.txt` output succeeds and contains key node text; legacy formats (png/svg/jpeg) remain unchanged

### 6.5 Regression Coverage from Real DSL

Specific regression tests from diagram DSL inputs:

**Sequence Diagram:**
```text
sequenceDiagram
  User->>Pintora: render this
  == Divider ==
```

Assertions:
- Actor label row does not contain both actor text and horizontal border glyphs
- Divider label row does not contain both divider text and crossing line glyphs

## 7. Constraints & Limitations

### 7.1 Implementation Constraints
- Current `AsciiRenderer.ts` may be "rewritten from scratch" without maintaining internal compatibility
- Only preserve external contracts: `IRenderer` interface, `renderer: 'ascii'` registration key, `getTextContent()`

### 7.2 Functional Limitations
- **No ANSI color output in v1**, `ansi` config fixed to `false`
- No pixel-perfect geometric consistency with SVG; controllable geometric distortion allowed

### 7.3 Known Limitations

- Only a first semantic subset is implemented: `backdrop`, `decoration`, `occludesBelow`, `strokePolicy`
- Some diagrams still create rects/lines that are visually "background-like" but are not yet tagged with semantics
- Normalization is centralized but still focused on text + separator + container constraints; richer constraints (e.g., separator-vs-text interval avoidance in dense rows) are not implemented yet
- Divider assertions were narrowed to "text is not pierced directly" rather than "the entire row has no horizontal line", because with the new backdrop semantics the outer line may legitimately continue outside the backdrop bounds
- Container-aware clamping currently relies on `container` semantics only where artists already emit them (class entity is covered; other diagrams still need migration where relevant)

### 7.4 Non-Goals of This Iteration

- Do not make ASCII visually identical to SVG at any cost
- Do not infer semantic intent from fill/stroke colors
- Do not reintroduce diagram-specific behavior through `className`
- Do not solve every line-snapping inconsistency before a broader normalized draw-op pass exists

---

## 8. Design Decisions

### 8.1 Why Semantic Rendering Was Chosen

#### Rejected Approaches

**Renderer-side `className` checks**
- Too brittle, diagram-specific, and impossible to scale cleanly
- Led to fixes that worked for one diagram while regressing others

**Color-based heuristics**
- Too implicit and renderer-dependent
- Artists already know the intent and should express it directly

**Aggressive text-row avoidance in rasterizer**
- Fixed one diagram while breaking others
- Changed placement after layout instead of defining intended semantics up front

#### Chosen Approach

1. Put intent on `Mark` through `semantic` metadata
2. Preserve intent through normalization
3. Let each renderer interpret the same intent according to its fidelity

This enables:
- SVG/Canvas: Render all strokes and fills as specified
- ASCII: Skip optional strokes, clear backdrops, clamp text to containers

### 8.2 Pre-Snapping vs Post-Repair

**Earlier approach**: Detect collisions at rasterization time and repair placement
- **Problem**: Unstable, caused regressions across diagram types

**Current approach**: Resolve placement deterministically before rasterization
- **Benefit**: Consistent, testable, no diagram-specific hacks

---

## 9. Future Work

### 9.1 Follow-ups

- Migrate note backgrounds, relation label backdrops, and similar helpers to semantic metadata where appropriate
- Consider introducing a general `NormalizedDrawOp` pass so text, rect, and line snapping all derive from the same normalized layout contract
- Consider adding explicit semantic variants for:
  - `labelBackdrop`
  - `sectionBackdrop`
  - `underlineDecoration`
  - `separator`
- Revisit line snapping once more ASCII fidelity work is needed, but keep that change semantic-driven instead of diagram-driven
- Extend container semantics to other diagrams that have clear "inner content area vs border" contracts
- Consider adding constraint solving in normalization (priority + candidate-row scoring) instead of fixed per-role snapping rules

### 9.2 Optimization Guidance

When extending this work, prefer this order:

1. Add semantic intent at mark creation time
2. Preserve that intent through normalization
3. Add renderer behavior based on semantics
4. Add focused regression coverage from real diagram DSL

**Avoid this order:**

1. Observe a broken ASCII row
2. Add collision avoidance in `rasterizer.ts`
3. Special-case a diagram/class/helper name

The next meaningful architectural step is likely a general normalized draw-op pass that resolves:
- text anchor → final top-left → grid row/col
- rect geometry → fill/stroke visibility contract
- line/underline snapping → final grid cells

Once that exists, the rasterizer can become mostly a deterministic executor instead of a place that still contains layout-sensitive policy.

---

## 10. Reference & Inspiration

Learn from the mature experience of other projects:
- Clear distinction between logical coordinates (grid) and drawing coordinates (canvas)
- Separate "parsing/layout/drawing/composition" into modules to reduce single-file complexity
- Variable row/column width preferred over fixed grid for better long label accommodation
- Path routing first determines direction, then path selection, for more stable output
- Junction character merging uses dedicated rule tables to avoid if-else bloat

---
