# ASCII Renderer 实现回顾

> 分支: `feat/renderer-ascii` | 基线: `48ef0a6`..HEAD | 日期: 2026-04-19

## 一、改动概览

从 `48ef0a6` 到 HEAD 共 9 个提交，新增/大幅修改了约 80 个文件，核心目标是：在 Pintora 现有 SVG/Canvas 管线之上，叠加一条低精度文本渲染管线。

### 1.1 新增核心管线 (`packages/pintora-renderer/src/renderers/ascii/`)

| 文件 | 职责 |
|------|------|
| `mark-walker.ts` | 遍历 Mark 树，收集语义化 `DrawOp[]`；Circle/Ellipse/Path 采样为点序列 |
| `normalize-ops.ts` | 栅格化前的修复与对齐（文本 clamp、边框防 collapse、connector 间距等） |
| `rasterizer.ts` | 将 `DrawOp[]` 投射到 `TextGrid`：Bresenham 线段、compact 模板、文本 placement |
| `grid.ts` | `TextGrid`：cell 级别网格，存储 `lineMask`/`diagonalMask`/`text`/`priority`，4 层优先级 |
| `glyph.ts` | `lineMask` → Unicode box-drawing 字符查表（`┌┐└┘├┤┬┴┼─│`） |
| `connector-glyphs.ts` | connector 的 Unicode 紧凑模板（`▶▷╌╟╢╤╧○`） |
| `symbol-glyphs.ts` | symbol 的 Unicode 紧凑模板（`●◉◇○△▽◁▷`） |
| `frame-glyphs.ts` | frame 的 Unicode 紧凑模板（note `╭╮╰╯┬`、decision `◇`） |
| `path-flattener.ts` | SVG path (M/L/H/V/C/Q/A/Z) 采样为 polyline |
| `text-metrics.ts` / `text-layout.ts` / `char-width.ts` | CJK-aware 字符宽度、文本行列测量、grid 对齐 |

### 1.2 语义体系扩展 (`packages/pintora-core/src/types/graphics.ts`)

在 `Mark.semantic` 上新增了一整套低精度渲染契约：

- **`role`**: `container` / `backdrop` / `separator` / `decoration` / `connector` / `symbol`
- **`strokePolicy`**: `always` / `optional` / `none`
- **`occludesBelow`**: backdrop 是否清除下层内容
- **`connector`**: `family` / `shaftStyle` / `startTerminator` / `endTerminator` / `compactEndpointClearance` / `compactEndpointClearanceMode` / `compactLaneReservation`
- **`symbol`**: `family` / `kind` / `direction`
- **`frame`**: `family` / `kind` / `borderStyle` / `cornerStyle`
- **`text`**: `lowFidelityVisibility` (`render` / `omit`)

### 1.3 各 diagram 的侵入式标注

5 个 diagram artist 共 **+490/-101** 行，核心工作是在原有 SVG/Canvas 绘制代码中插入 `semantic`：

- **Sequence**: message line → `ConnectorSemantic`（arrow-filled/open/cross/dashed）；note bg → `FrameSemantic(note-card)`
- **Activity**: action rect → `container`；decision bg → `FrameSemantic(decision)`；start/end/diamond → `SymbolSemantic`；straight edges → `ConnectorSemantic`（vertical clearance + lane reservation）
- **ER**: 最大改动（+323 行）。entity box → `container`；attribute cell → `container`；header separator → `separator`；relationship → `ConnectorSemantic`（cardinality terminators + `compactEndpointClearance: both, allow-partial`）；inheritance triangle → `SymbolSemantic`（含 direction）；relationship layout 引入 dummy node 预留 label lane
- **Class**: entity bg → `container`；section bg → `backdrop`；sep-line → `separator`；note → `FrameSemantic`
- **Component**: relationship → `ConnectorSemantic`；interface circle → `SymbolSemantic(component-interface)`

---

## 二、渲染管线

```
GraphicsIR
  → mark-walker      (Mark 树 → DrawOp[]，含 semantic 识别和 path 采样)
  → normalize-ops    (坐标对齐、重叠修复、文本 placement、connector 间距预留)
  → rasterizer       (ops → TextGrid cell，compact 模板或 Bresenham 线段)
  → TextGrid.toString()  (mask 合并 → Unicode 字符 → trimRight → 纯文本)
```

### 2.1 关键抽象

- **`DrawOp`**: `segment` / `rect` / `text` / `connector` / `symbol` / `frame`
- **`TextGrid`**: 二维 cell 数组，每个 cell 有 `lineMask`（DIR_N/S/E/W）、`diagonalMask`、文本、优先级
- **`AsciiLayer`**: BACKGROUND(1) < LINES(2) < MARKERS(3) < TEXT(4)，高优先级覆盖低优先级

---

## 三、实现要点

### 3.1 修复链的本质

所有问题都围绕同一个核心矛盾：**SVG/Canvas 的浮点坐标 → ASCII 的离散 cell 网格，信息必然丢失**。

修复链从"采样后修复"逐步演变为"语义化 + 规范化"：

| 问题 | 修复手段 |
|------|---------|
| 文本落在边框/分隔线上 | container inner bounds clamp + separator row 避让 |
| ER 实体标题与属性行重叠 | 共享边框全局 round/ceil 协调 + 嵌套 container 防 collapse |
| 箭头标记变成噪声点 | connector compact 模板替代几何采样 |
| note/decision 像普通盒子 | frame compact 模板（`╭╮╰╯◇`） |
| ER 基数标记插入实体边框 | `compactEndpointClearance` 端点外推 + `compactLaneReservation` 预留给外部 lane |
| 继承三角形方向丢失 | `symbol.direction` → `△▽◁▷` |
| ISA 标签覆盖三角形 | `text.lowFidelityVisibility: omit` |
| 相邻可见 rect 边框重叠 | 检测 grid 对齐后的 col/row 冲突，强制外推 1 cell |

### 3.2 normalize-ops 的核心机制

1. **Shared border snapping**: 收集所有 container 的 minX/maxX/minY/maxY，匹配的对齐到同一个 grid line，避免 `││`
2. **Nested container border collapse prevention**: 子 container 若 snap 后与父边框重合，向外推 1 cell
3. **Visible rect overlap prevention**: 两个相邻可见 rect snap 后间距 < 2 cells，则压缩较小者
4. **Connector gap reservation（迭代式）**: 遍历 vertical compact connector，若 source bottom > target top，则将 target 容器及其内部文本/连接端点整体下移（最多 8 轮迭代）
5. **Text placement**: 测量文本 cell 尺寸 → 计算 placement → clamp 到 container inner bounds → 避让 separator rows
6. **Connector endpoint clearance**: 根据 `compactEndpointClearance` 将端点推离 container 边框 1 cell

### 3.3 栅格化策略

- **Segment** → Bresenham → `lineMask` (DIR_N/S/E/W)
- **Rect border** → 4 条 segment
- **Compact connector** → 若水平/垂直对齐且足够空间，用 Unicode shaft + terminator 模板；否则 fallback 为 segment 采样
- **Compact symbol** → 若 glyph 尺寸 <= 可用 cell 数，直接绘制 Unicode glyph；否则 fallback 为采样路径
- **Compact frame** → note/decision 有固定模板；否则 fallback 为采样路径
- **Text** → 最高优先级覆盖，含 continuation cell 标记（宽字符占多 cell）

---

## 四、当前实现缺陷

### 4.1 normalize-ops 是"修补地狱"

`normalize-ops.ts` 近 1000 行，承担了本不应由 renderer 承担的大量职责：

- 它不是简单的坐标转换，而是在**修复 diagram layout 的输出缺陷**
- Shared border snapping、nested collapse prevention、rect overlap prevention、connector gap reservation、text placement 全部硬编码在同一个函数中
- Connector gap reservation 使用**迭代法**（最多 8 轮，每次只移一个容器），本质是因为 diagram 布局没有预留 ASCII 所需的垂直/水平间距
- 大量 O(n^2) 扫描：`collectTextRegions`、`findContainerBorderTouch`、`preventVisibleRectBorderOverlap`

### 4.2 语义契约是"补丁式"而非"体系化"的

- 只有**部分 diagram 的部分元素**有 semantic，其余完全依赖 `path-flattener` 采样
- `path-flattener` 采样 Circle/Ellipse/Path 的效果在 ASCII 下几乎不可读（32/40 段采样的弧线变成锯齿噪声）
- Symbol/Frame/Connector 的支持是**硬编码枚举**，新增一种符号需要改 `graphics.ts` + `*-glyphs.ts` + `rasterizer.ts` + 对应 artist
- `strokePolicy` 和 `occludesBelow` 的实际生效逻辑散落在 rasterizer 各处，没有统一规则

### 4.3 diagram 层与 renderer 严重耦合

- 每个 artist 需要手动调用 `makeConnectorSemantic` / `makeSymbolSemantic` / `makeFrameSemantic`
- ER artist 为了 ASCII 专门重构了 relationship layout（dummy node 预留 label lane），这本是 layout engine 的职责
- `makeAsciiDecorationSemantic()` 这种 helper 的存在说明 diagram 层已经在为 ASCII 的特殊需求服务

### 4.4 紧凑模板的成功条件过于严格

- Compact connector 只有在**完全水平或完全垂直**且端点在同一 row/col 时才生效
- 稍微弯曲的连线、斜向连接、短距离连接全部 fallback 到几何采样，效果极差
- Frame/Symbol 的 compact 渲染也有最小尺寸限制（如 note frame 要求 >=3x3 cells）

### 4.5 TextGrid 和 glyph 系统很原始

- 只有 4 个固定层级，没有真正的合成管线
- 对角线支持是事后添加的，与正交线条系统不统一
- `resolveLineGlyph` 是简单查表，遇到未知 mask 回退到 `·`
- 没有对"线宽"、"虚线样式"的真实支持，dashed 只是用 `╌╎` 替代 `─│`

### 4.6 测试策略偏向端到端

- `ascii-renderer-cases.spec.ts` 全是 DSL -> 文本的端到端测试
- `normalize-ops.spec.ts` 只有约 10 个测试用例，远不足以覆盖其 1000 行逻辑
- Golden test 只有一个 `sequence-basic.txt`

---

## 五、重新实现应避免的坑

### 5.1 不要在 renderer 侧做 layout 修复

当前最大的问题：`normalize-ops` 在试图修复 diagram layout 的输出。ER 的 vertical/horizontal clearance、activity 的 lane reservation、text separator 避让——这些都应该是 **layout engine 在输出 GraphicsIR 之前就保证的**。

> **建议**: 让 layout engine（dagre 或自定义）输出**网格对齐**的坐标，或至少输出带有 cell 间距约束的坐标。renderer 只做"投射"，不做"修复"。

### 5.2 不要先做几何采样再试图恢复语义

`path-flattener` 采样圆弧和贝塞尔曲线后，信息已经永久丢失。当前做法是在 `mark-walker` 阶段就根据 `semantic` 走捷径（compact template），否则才采样。

> **建议**: **完全抛弃几何采样**，要求所有 diagram 只输出 renderer 能直接理解的语义原语（rect、line、text、connector、symbol）。如果某个图形没有 semantic，它就不应该在 ASCII 中出现，而不是变成一堆噪声点。

### 5.3 不要把所有修复逻辑塞进一个 normalize 函数

当前的 `normalizeDrawOps` 是 1000 行的顺序过程函数，难以测试和扩展。

> **建议**: 拆分为独立的、可组合的 transform pipeline：
> ```
> alignToGrid -> resolveOverlaps -> placeText -> reserveConnectorSpace
> ```
> 每个阶段是纯函数，输入/输出都是 `DrawOp[]`，可单独测试。

### 5.4 不要依赖像素 round/floor/ceil 来推断结构

当前的 shared border snapping、text clamping、rect overlap prevention 都依赖 `Math.round(x / cellWidth)` 这种浮点运算。

> **建议**: 尽早把所有坐标转换为整数 cell 坐标。理想情况下 layout engine 直接输出整数 cell。

### 5.5 不要让每个 diagram artist 手动维护 semantic

当前每个 artist 需要知道 ASCII 的存在，并手动调用 helper 函数。这违背了 renderer 应该是透明替代的原则。

> **建议**: 在 `BaseArtist` 或更上层抽象中，让 `makeRect`/`makeLine`/`makeText` 等工厂函数自动根据上下文附加 semantic。例如：
> - 任何有 fill 的 rect -> 自动标记为 container 或 backdrop
> - 任何有 text 的连线 -> 自动标记为 separator
> - 箭头、菱形等已知图形 -> 自动标记为 symbol

### 5.6 不要用迭代法修复重叠

`reserveCompactConnectorGaps` 最多迭代 8 次移动容器。这种做法脆弱且不可预测。

> **建议**: 应该在一开始就通过约束求解或预留间距来避免重叠。例如 ER relationship 的 dummy node 思路是对的，但应该在更通用的层面实现。

### 5.7 不要把 connector 布局策略硬编码到 renderer

当前的 `compactEndpointClearance`、`compactLaneReservation`、`compactEndpointClearanceMode` 是 renderer 侧暴露给 diagram 的配置。

> **建议**: 这些概念过于底层。Diagram 应该只声明"这是什么关系"（如 ER one-to-many），renderer 根据自身能力决定如何渲染。不应让 diagram 作者理解 ASCII 的 cell 间距问题。

### 5.8 不要只支持 Unicode box-drawing

当前实际上已经放弃了 strict ASCII（commit `884cdc1`），全部使用 Unicode。但如果未来需要纯 ASCII（`|+-/`），glyph 系统需要重新设计。

> **建议**: 如果目标是"干净美观的 ASCII"，应该先明确输出字符集。Unicode 确实比纯 ASCII 容易做好看，但这不是"ASCII renderer"了。

---

## 六、一句话总结

> 当前的实现是一条**"先采样、后修复、再语义化"**的渐进式补丁链。核心教训是：**renderer 不应该修复 layout 的缺陷**。如果重来，应该让 layout engine 直接输出网格对齐、语义完备的指令，renderer 只做简单的 cell 投射和字符选择。
