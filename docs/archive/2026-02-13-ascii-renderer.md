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
- **Connector Endpoint Semantics**: Arrows and ER cardinality markers carry meaning at connector endpoints; once flattened into generic segments, distinctions such as filled/open/dashed arrows or crow-foot cardinalities are lost.
- **Frame Semantics Loss**: Notes and decision bodies also carry meaning through border style and corner treatment; once reduced to plain rect/path geometry, they become indistinguishable from ordinary content boxes.

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

### 1.4 ER Entity Header/Separator Collision
Another regression class appeared in `erDiagram` entities with attributes and comments:

```text
erDiagram
  PERSON {
    string phone "phone number"
  }
```

Issues:
- The attribute comment could overwrite the right border (`phone numbe|`-style breakage in ASCII mode)
- The entity title `PERSON` could share a row with a header separator or top border
- A renderer-side "clear horizontal line under centered title" fix could preserve the title row but accidentally erase the real separator row above the attributes

**Root Cause**:
- The ER artist originally emitted only the outer container; attribute cells also needed to participate as semantic containers for low-fidelity text placement
- Container bounds that looked fine in SVG pixel space could collapse after ASCII grid snapping, leaving no stable inner row/col for text
- Naive "outward snap every container independently" fixed text-vs-border collisions but introduced double borders (`||`, `++`) on shared cell boundaries
- A generic renderer-side repair hook was too broad when applied automatically to all centered/middle text

**Refined Direction**:
1. Let artists emit semantic structure, but do not change base SVG/Canvas geometry just to satisfy ASCII
2. Let ASCII normalization interpret container semantics with grid-aware rules, including outward snapping where needed
3. Snap shared container borders collaboratively so adjacent cells still share one border line
4. Use renderer-side repairs only as explicit, low-level capabilities, not as broad heuristics

### 1.5 Connector Marker Distortion
Another regression class appeared once the ASCII renderer started covering more real diagrams: sequence arrowheads and ER cardinality markers were being emitted by artists as plain geometric `path` / grouped marks, then rasterized like generic strokes.

Representative examples:

```text
sequenceDiagram
  A->>B: solid
  B-->>A: dashed
  A-)B: open
```

```text
erDiagram
  A ||--o{ B : one-to-many
  C }|--o{ D : many-to-many
```

Issues:
- sequence `->>`, `-->>`, `-)`, `--)`, `--x` could collapse into almost the same shaft+noise output
- ER `o|`, `|{`, `}|`, `o{` markers were approximated as circles/curves/lines, which produced unreadable clutter on a text grid
- fixing this by “sampling paths better” still did not solve the core problem: the renderer needed to know marker meaning, not just marker geometry

**Root Cause**:
- artist output encoded connector meaning only in geometry, not in semantics
- `mark-walker` flattened those geometric marks too early, so the ASCII renderer had no way to distinguish shaft from endpoint marker
- `AsciiLayer.MARKERS` existed conceptually, but there was no dedicated connector op or glyph registry to consume it

**Refined Direction**:
1. Put connector semantics on the shaft mark, not on the sampled marker geometry
2. Keep existing SVG/Canvas marker geometry as fallback, but mark it as optional decoration for ASCII
3. Let ASCII collect a dedicated `ConnectorOp` and render compact endpoint glyph templates directly
4. Support horizontal and vertical compact rendering separately; if a connector does not normalize to a stable axis-aligned span, fall back to geometric rasterization

### 1.6 Frame Meaning Lost Without Color
Another regression class appeared after connector and compact symbol handling improved: larger framed regions were still rendered as generic boxes or sampled paths.

Representative examples:

```text
activityDiagram
  :Do work;
  note right: side note
```

```text
activityDiagram
  if (ready?) then
    :Accept;
  else (no)
    :Reject;
  endif
```

Issues:
- notes relied on background color in SVG/Canvas to read as annotations, but collapsed into ordinary `|...|` boxes in ASCII
- activity decision bodies were emitted as path geometry and degraded into noisy pseudo-diamonds on the text grid
- fixing either case by “sampling better” still did not tell the renderer whether the user was looking at a note card or a decision frame

**Root Cause**:
- note semantics were only partially expressed as `backdrop` occlusion, not as “annotation frame”
- decision body semantics lived only in path geometry, not in a renderer-facing frame contract
- ASCII had compact glyph handling for connectors and symbols, but no frame-aware border templates

**Refined Direction**:
1. Keep `role` semantics (`backdrop`, `container`) for layout/occlusion, but add optional `frame` semantics for border meaning
2. Let note backgrounds remain rect-based text regions, but render them as annotation cards in ASCII
3. Let activity decision bodies keep path geometry for SVG/Canvas while ASCII renders them from reviewed frame templates
4. Use frame-specific templates in Unicode and strict ASCII, with geometric fallback when the compact frame does not fit

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
Graphics IR → Semantic Op Collection → IR Normalization → Grid Rasterization → Layer Composition → Text Output
```

### 3.2 Key Components

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **TextGrid** | 2D character buffer + layer priority buffer | `grid.ts` - `TextGrid` class |
| **GlyphResolver** | Select Unicode box-drawing characters (`─│┌┐└┘├┤┬┴┼`) based on adjacency direction bitmask; use `/\` for diagonals | `glyph.ts` - `resolveLineGlyph()`, `mergeGlyph()` functions |
| **PathFlattener** | Discretize `path` (array/string) into line segment collections; sample curves/arcs with adaptive step intervals | `path-flattener.ts` - `flattenPath()` function |
| **ConnectorGlyphRegistry** | Map semantic connector terminators to compact horizontal/vertical glyph templates for Unicode and ASCII charsets | `connector-glyphs.ts` |
| **FrameGlyphRegistry** | Map semantic note/decision frames to Unicode and ASCII border templates | `frame-glyphs.ts` |
| **TextPlacer** | Place text according to `textAlign`/`textBaseline`, handling CJK wide character widths | `text-layout.ts` - `resolveTextPlacement()` function |
| **MarkWalker** | Traverse `GraphicsIR`, normalize various Marks (rect/line/poly/path/text/group) into standard draw operations, including semantic connectors, symbols, and path-backed frames | `mark-walker.ts` - `collectDrawOps()` function |
| **Normalizer** | Normalize text placement to avoid separator lines, clamp text inside containers | `normalize-ops.ts` - `normalizeDrawOps()` function |
| **TextMetrics** | Calculate text dimensions and line breaks for ASCII grid | `text-metrics.ts` - `measureAsciiText()` function |

### 3.3 Rendering Order (Layer Priority)
Fixed layer ordering to avoid accidental overwrites:
1. **Background/Fill** (layer 1)
2. **Borders/Lines** (layer 2)
3. **Arrows/Markers** (layer 3)
4. **Text** (layer 4, highest priority)

### 3.4 Three-Layer Rendering Contract

The renderer is intentionally split into three layers to separate concerns:

#### 1. Artist Layer
Emits geometry plus semantic intent. Marks declare whether they are:
- Real borders (strokes that should appear in all renderers)
- Decorative underlines (can be omitted in low-fidelity renderers)
- Text backdrops (clear lower content, provide contrast)
- Containers (define inner content areas with border boundaries)
- Connectors (shaft style plus endpoint terminator semantics)

#### 2. Normalization Layer
Preserves semantic intent into renderer-facing operations instead of flattening everything into generic lines too early.

Responsibilities:
- **Separator Snapping**: Align separator segments to stable grid rows/cols
- **Text Anchor Resolution**: Convert `textAlign`/`textBaseline` to final pixel top-left and snapped grid position
- **Container Clamping**: Keep text placement inside container inner bounds
- **Container Grid Fitting**: Expand semantic container bounds to stable ASCII grid cells without mutating source diagram layout
- **Shared Border Coordination**: When adjacent semantic containers share a border, snap both sides to the same grid line to avoid doubled borders

Location: `packages/pintora-renderer/src/renderers/ascii/normalize-ops.ts`

#### 3. Rasterization Layer
Applies renderer-specific fidelity rules:
- Whether a backdrop clears lower content (`occludesBelow`)
- Whether an optional stroke is visible in ASCII (`strokePolicy`)
- How text anchor semantics snap to the character grid
- How semantic connectors are turned into compact endpoint glyph templates or geometric fallback

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
type MarkSemanticRole = 'container' | 'backdrop' | 'separator' | 'decoration' | 'connector'
type MarkStrokePolicy = 'always' | 'optional' | 'none'

type ConnectorTerminatorKind =
  | 'none'
  | 'arrow-filled'
  | 'arrow-open'
  | 'cross'
  | 'er-only-one'
  | 'er-zero-or-one'
  | 'er-one-or-more'
  | 'er-zero-or-more'

interface MarkSemantic {
  role?: MarkSemanticRole
  occludesBelow?: boolean  // Clears lower-layer content (for backdrop)
  strokePolicy?: MarkStrokePolicy  // Controls stroke rendering
  connector?: {
    family: 'sequence-message' | 'er-relationship'
    compact: boolean
    shaftStyle: 'solid' | 'dashed'
    startTerminator?: { kind: ConnectorTerminatorKind }
    endTerminator?: { kind: ConnectorTerminatorKind }
  }
  frame?: {
    family: 'annotation' | 'activity-node'
    kind: 'note' | 'decision'
    compact: boolean
    borderStyle: 'solid' | 'dashed' | 'note-card'
    cornerStyle?: 'square' | 'decision'
  }
}
```

#### Semantic Roles

| Role | Description | Current Usage |
|------|-------------|---------------|
| **container** | Defines an area with inner content and outer border | Class entity outer rect, ER entity outer rect |
| **backdrop** | Background area that may occlude content below | Label backgrounds, section backgrounds, divider label boxes |
| **separator** | Horizontal/vertical dividing line | Class section separators, ER header/body separator |
| **decoration** | Visual accent that can be omitted in low-fidelity | Static member underlines |
| **connector** | A semantic shaft whose endpoints carry marker meaning | Sequence messages, ER relationships |

`frame` is intentionally orthogonal to `role`:
- `role` still answers “how does this participate in layout, clamping, and occlusion?”
- `frame` answers “what kind of border treatment should ASCII use?”
- current usage:
  - notes: `role: 'backdrop'` + `frame.kind = 'note'`
  - activity decision bodies: `role: 'container'` + `frame.kind = 'decision'`

#### Semantic Behaviors

- **container**: Text placement is clamped inside container boundaries (inner rows/cols)
- **container**: In ASCII normalization, container rects may be grid-fit outward; shared borders between neighboring containers are unified onto one snapped grid line
- **backdrop**: Clears content below when `occludesBelow: true`
- **separator**: Horizontal lines that text should avoid overlapping; snapped to stable grid positions
- **connector**: May bypass generic path flattening and instead become a dedicated `ConnectorOp`
- **connector**: ASCII can render compact endpoint glyphs such as `▶`, `▷`, `○╟`, `╢`, `╤`, `╧`
- **frame**: ASCII can replace a generic box/path border with a reviewed frame template while preserving the original geometry as fallback
- **strokePolicy**: 
  - `'none'` or `'optional'` strokes are skipped in ASCII output
  - `'always'` strokes are preserved even in low-fidelity renderers

### 4.4 Pre-Rasterization Normalization

To reduce post-layout patching, ASCII applies semantic-aware normalization before glyph writes:

1. **Separator Snapping**: `separator` segments are aligned to stable grid rows/cols to prevent drift
2. **Text Anchor Resolution**: Derive final grid position from `textAlign`/`textBaseline` semantics
3. **Container Grid Fitting**: `container` rects are snapped outward to stable grid bounds in ASCII only
4. **Shared Border Unification**: neighboring `container` rects that already share a border are snapped to one common grid line
5. **Container Clamping**: Restrict text placement to inner bounds of the normalized `container` rects
6. **Separator Avoidance**: Move text off rows occupied by separators when possible

This keeps rules generic and semantic-driven instead of class-name driven.

### 4.5 Semantic Connector Rendering

When a shaft mark carries connector semantics, the ASCII pipeline now treats it differently from plain geometry:

1. `mark-walker` emits a `ConnectorOp` instead of flattening the shaft into ordinary segments
2. `rasterizer` checks whether the connector normalizes to a stable horizontal or vertical span
3. If stable, it reserves endpoint cells/rows and writes compact glyph templates directly
4. If unstable, it falls back to geometric segment rasterization

Current compact coverage:
- **Sequence**: filled/open arrows, dashed shafts, cross ends
- **ER LR**: `│`, `○│`, `╟`, `╢`, `○╟`, `○╢`
- **ER TD**: `─`, `○─`, `╤`, `╧`, `○╤`, `○╧`

### 4.6 Semantic Frame Rendering

When a mark carries `semantic.frame`, ASCII can treat it as a reviewed frame instead of a generic box/path.

Current compact coverage:

- **Note Frame**
  - strict ASCII: quoted-card style
    ```text
    .--------.
    : note   :
    '--------'
    ```
  - Unicode: folded-corner note card, refined toward a B1-style structured fold
    ```text
    ╭────────┬╮
    │ note   ││
    │ text   ╰│
    ╰─────────╯
    ```
  - notes keep their `backdrop` semantics for occlusion and text-region selection; `frame` only changes border treatment

- **Activity Decision Frame**
  - strict ASCII:
    ```text
    <-------->
    |Decision|
    <---+---->
    ```
  - Unicode:
    ```text
    ◇────────◇
    │Decision│
    ◇────┬───◇
    ```
  - decision bodies keep path geometry for SVG/Canvas; ASCII uses a path-backed semantic frame op and falls back to geometry when the template does not fit

### 4.7 Conflict Resolution Principle

The later ER fixes clarified an important rule: collision handling should be split between **semantic layout intent**, **renderer-specific normalization**, and **draw-time repair**.

1. **Artist intent first**: If a diagram has real structure (e.g. ER title band + body rows), emit semantic containers/separators so renderers understand the contract
2. **Normalizer second**: Resolve text-vs-separator and text-vs-container-border conflicts by snapping and clamping against renderer-specific grid constraints
3. **Raster repair last**: Keep local repair abilities available for narrow cases, but do not apply them as a blanket heuristic for all centered labels

This avoids two fragile patterns:
- mutating base diagram layout just to satisfy one renderer
- renderer-side line clearing that makes one row look correct while destroying adjacent semantic structure

### 4.8 Degradation Strategy
- Complex Bezier curves, cloud shapes, and other non-exactly-reproducible shapes: approximate with discrete line segments
- Semantic connectors that do not normalize to a stable horizontal or vertical span: fall back to geometric segment rasterization
- Semantic frames that lack enough space or glyph support: fall back to the original rect/path border rendering
- If discretization fails: fall back to bounding box outline while preserving text

### 4.9 CJK Wide Character Support
- Use `wcwidth`-like logic for CJK wide characters (display width = 2)
- Ensure mixed Chinese/English text alignment without label drift

### 4.10 Connector And Frame Lessons Learned

The connector work exposed a few practical rules that are easy to forget:

1. **Do not “improve” marker fidelity by sampling paths more densely**. That only makes ASCII output noisier if the renderer still does not know the marker's meaning.
2. **Put semantics on the shaft, not on the endpoint geometry**. The shaft already owns routing and direction; it is the only stable place to attach endpoint intent.
3. **Keep geometric markers for SVG/Canvas, but mark them as optional decoration for ASCII**. Otherwise ASCII renders both the compact glyph and the old geometry on top of each other.
4. **Horizontal and vertical compact rendering need separate template sets**. The LR solution does not automatically handle TD layouts.
5. **Role labels and marker cells compete for the same compact area**. Short labels are fine in regression tests, but real diagrams may still need future spacing policies if labels are extremely close to connector ends.
6. **Do not overload `role` with visual identity**. Notes still need `backdrop` behavior, but their “this is a note card” meaning belongs in a separate frame contract.
7. **Rect-based frames and path-backed frames need different collection strategies**. Notes can reuse rect normalization directly; decision bodies benefit from a dedicated frame op because their source geometry is path-based.
8. **Folded-corner note cards need text-region reservation**. Once the top-right corner becomes a visible fold, normalization must reserve right-side cells so note text does not collide with the fold.

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
- **Connector Glyph Mapping**: Horizontal and vertical compact glyph templates for sequence arrows and ER cardinality markers
- **Connector Fallback**: Non-axis-aligned semantic connectors fall back to geometric rasterization
- **Frame Glyph Mapping**: Note-card and decision-frame templates in Unicode and strict ASCII
- **Frame Fallback**: Unsupported or undersized semantic frames fall back to geometric rect/path borders

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

**ER Diagram:**
```text
erDiagram
  PERSON {
    string phone "phone number"
  }
```

Assertions:
- Attribute comment row retains the closing right border in ASCII mode
- Entity title row is not pierced by horizontal border glyphs
- The header/body separator row still exists and is not mistakenly removed by title-related repairs
- Adjacent attribute cells do not produce doubled shared borders such as `||` or `++`

**ER Cardinality Markers:**
```text
erDiagram
  @param {
    layoutDirection LR
  }
  A ||--o{ B : r
```

```text
erDiagram
  A ||--o{ B : r
```

Assertions:
- LR layout renders compact horizontal marker glyphs such as `○╟`, `╢`
- TD layout renders compact vertical marker glyphs such as `○╤`, `╧`
- Both layouts avoid falling back to distorted curve/cross noise for supported cardinalities

**Activity Diagram:**
```text
activityDiagram
  start
  partition Init {
    :read config;
    :init internal services;
    note left: init themes
  }
```

```text
activityDiagram
  start
  partition Init {
    :read config;
    :init internal services;
    note right: init themes
  }
```

Assertions:
- a nested action box inside a semantic `container` still keeps its own top border instead of collapsing onto the partition border row
- a left-side note box and a sibling action box keep at least one blank grid column between their visible borders
- a right-side note label stays inside its own note-card frame instead of being clamped back into the outer partition text region
- a single left-side note no longer forces the partition title row to visually merge with the note/action top border row

**Unicode Note Card:**
```text
activityDiagram
  :Do work;
  note right: side note
```

Assertions:
- the note uses a folded-corner card rather than a plain `┌...┐ / └...┘` box
- the top row contains the fold marker structure (`┬╮`)
- the fold descends on the right side (`││`, then `╰│`) without overwriting note text

**Activity Decision Frame:**
```text
activityDiagram
  if (ready?) then
    :Accept;
  else (no)
    :Reject;
  endif
```

Assertions:
- Unicode output uses decorated corners such as `◇`
- strict ASCII output uses decorated edges such as `<...>` and bottom `+`
- the decision body remains readable as a content frame rather than sampled path noise

### 6.6 Test Debugging Workflow

Repeated temporary `console.log` edits in tests were error-prone and noisy. The test helper now supports an environment-variable-based debug path:

```bash
PINTORA_ASCII_TEST_DEBUG=1 pnpm exec jest path/to/spec --runInBand
```

Behavior:
- `renderToAscii(...)` still returns plain text normally
- When `PINTORA_ASCII_TEST_DEBUG=1`, the helper prints the rendered ASCII text automatically
- This allows inspection of failing snapshots/cases without editing individual test bodies

## 7. Constraints & Limitations

### 7.1 Implementation Constraints
- Current `AsciiRenderer.ts` may be "rewritten from scratch" without maintaining internal compatibility
- Only preserve external contracts: `IRenderer` interface, `renderer: 'ascii'` registration key, `getTextContent()`

### 7.2 Functional Limitations
- **No ANSI color output in v1**, `ansi` config fixed to `false`
- No pixel-perfect geometric consistency with SVG; controllable geometric distortion allowed

### 7.3 Known Limitations

- The semantic subset is still intentionally small; `container`, `separator`, `backdrop`, `decoration`, `occludesBelow`, and `strokePolicy` are the main primitives in active use
- The semantic subset now also includes optional `connector`, `symbol`, and `frame` extensions, but coverage remains intentionally selective
- Some diagrams still create rects/lines that are visually "background-like" but are not yet tagged with semantics
- Normalization is centralized but still focused on text + separator + container constraints; richer constraints (e.g., dense multi-label packing, interval-aware line carving) are not implemented yet
- Divider assertions were narrowed to "text is not pierced directly" rather than "the entire row has no horizontal line", because with the new backdrop semantics the outer line may legitimately continue outside the backdrop bounds
- Container-aware clamping and text-region selection now cover class, ER, and the migrated activity shapes (action boxes, partition frames, and note backdrops), but many other diagrams still rely on plain geometry only
- Note-card frame semantics are currently wired for activity/sequence/class notes; other note-capable diagrams may still need explicit adoption
- Container snapping is renderer-specific: ASCII may expand and unify semantic container borders during normalization, while SVG/Canvas keep the original geometry
- The text-region rule now prefers the smallest visible rect (`container` or bordered `backdrop`) that contains the text anchor. For note cards it additionally reserves right-side columns for the folded corner, but this is still a heuristic rather than a full constraint solver.
- Visible-rect spacing now preserves a minimal blank-cell gap when raw geometry already contains a positive gap, but this is still grid-quantized and may need more explicit policy if future diagrams stack many bordered labels densely
- Renderer-side repair hooks exist, but broad automatic use of them is considered risky; the preferred fix path is still artist semantics plus normalization

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

**Aggressive automatic repair in rasterizer**
- Can fix one row while destroying nearby semantic structure
- ER title/header experiments showed that blindly clearing horizontal lines for centered titles can erase the true separator row
- Changed placement or visibility too late in the pipeline, after structural intent should already have been decided

#### Chosen Approach

1. Put intent on `Mark` through `semantic` metadata
2. Let artists emit enough structure for text-bearing containers (ER header/body split and attribute cell containers were concrete examples)
3. Preserve intent through normalization
4. Let each renderer interpret the same intent according to its fidelity, with repair hooks reserved for narrow explicit use

This enables:
- SVG/Canvas: Render all strokes and fills as specified
- ASCII: Skip optional strokes, grid-fit semantic containers, unify shared borders, and clamp text to containers

### 8.2 Pre-Snapping vs Post-Repair

**Earlier approach**: Detect collisions at rasterization time and repair placement
- **Problem**: Unstable, caused regressions across diagram types
- **Additional lesson**: generic repair heuristics are especially risky when they can remove lines that carry real semantic meaning

**Current approach**: Resolve placement deterministically before rasterization
- **Benefit**: Consistent, testable, no diagram-specific hacks
- **Refinement from ER work**:
  - add semantic structure in artists when it is genuinely missing
  - but keep renderer-specific geometric compromise in normalization, so non-ASCII renderers preserve original layout
  - when snapping semantic containers, shared borders must be coordinated globally rather than expanding each rect independently

---

## 9. Future Work

### 9.1 Follow-ups

- Continue migrating note backgrounds, relation label backdrops, and similar helpers to semantic metadata where appropriate. Activity notes are now covered; the remaining gap is broader diagram coverage and more uniform helper usage.
- Consider introducing a general `NormalizedDrawOp` pass so text, rect, and line snapping all derive from the same normalized layout contract
- Consider adding explicit semantic variants for:
  - `labelBackdrop`
  - `sectionBackdrop`
  - `underlineDecoration`
  - `separator`
- Revisit line snapping once more ASCII fidelity work is needed, but keep that change semantic-driven instead of diagram-driven
- Extend container semantics to other diagrams that have clear "inner content area vs border" contracts
- Consider adding constraint solving in normalization (priority + candidate-row scoring) instead of fixed per-role snapping rules
- If container snapping rules become more varied, consider extending `MarkSemantic` with explicit low-fidelity snapping hints instead of baking more assumptions into artists

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
