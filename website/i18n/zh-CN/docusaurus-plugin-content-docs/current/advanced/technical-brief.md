---
title: 技术简介
---

Pintora 通过合理的分层和抽象，为图表作者建立一套从 DSL 解析到图形绘制的简化工具链。

## 工作流程和数据

Pintora 的工作流程和数据如下所示，

```text
 Input Text
    |
    |  () IDiagramParser
    v
 DiagramIR
    |
    |  () IDiagramArtist
    v
 GraphicsIR
    |
    |  () IRenderer
    v
  Output
```

其中的 `IR` 是中间表示（Intermediate Representation）的缩写，代表了不同阶段的数据格式。

- `DiagramIR` 代表特定图表类型的逻辑数据，与图表的文字 DSL 联系紧密
- `GraphicsIR` 代表由 Pintora 提供的渲染层视觉描述数据格式

### IDiagramParser 和 DiagramIR

`IDiagramParser` 的作用是从图表的文字 DSL 转换为逻辑数据，为后续的视觉元素构建准备好基础。

例如 Pintora 内建的 Entity Relationship Diagram 对应的逻辑数据格式为：

```ts
export type ErDiagramIR = {
  entities: Record<string, Entity>
  relationships: Relationship[]
}

export type Attribute = {
  attributeType: string
  attributeName: string
  attributeKey?: string
}

export type Entity = {
  attributes: Attribute[]
}

export type Relationship = {
  entityA: string
  roleA: string
  entityB: string
  relSpec: RelSpec
}

export type RelSpec = {
  cardA: Cardinality
  cardB: Cardinality
  relType: Identification
}
```

可以使用任何的语法分析工具和技术来实现这一过程，从逐行分析的正则表达式，到各种 parser generator 生成的程序，只要能在 JS 环境下运行就行。

Pintora 的内建图表使用了 [nearley.js](http://nearley.js.org/) 用于生成上下文无关的语法解析器，它简单易用，基于改进了的 Earley 算法，性能尚可（尽管也许是主流解决方案中比较慢的，但那是理论上的最坏情况下，实际情况可能好很多。对于小型文本图表 DSL 来说完全够用），而且运行时很小。图表作者可自行选择高效的 parser generator 方案，如 jison / PEG.js ，或是手写分析器。

### IDiagramArtist 和 GraphicsIR

`IDiagramArtist` 将图表逻辑数据转换为视觉描述数据 `GraphicsIR`，为之后不同平台的 `IRenderer` 提供输入。

`GraphicsIR` 的主要部分有：

- `rootMark` 为图表的根元素，一定是一个 `Group` 类型的标记，所有的其他元素都是它的子元素
- 描述图表整体宽高的 `width` 和 `height`
- 一个可选的 `bgColor` 作为图表的背景色

```ts
export type Mark = Group | Rect | Circle | Ellipse | Text | Line | PolyLine | Polygon | Marker | Path | GSymbol

export interface GraphicsIR {
  mark: Mark
  width: number
  height: number
  bgColor?: string
}
```

Pintora 将视觉元素抽象为不同类型的标记（Mark）。使用属性（Attribute）的集合 `attrs` 来描述元素的特性，一些（如 `x` 和 `y`）为共有属性，同时每种元素也具有自己特有的属性（如 `Path` 元素的 `path`）。

除 `attrs` 外，在标记上也会有有一些特殊的字段，用于描述其他行为。例如用于描述视觉变换的 `matrix`，或是`Group` 特有的 `children`。

```ts
export interface IMark {
  attrs?: MarkAttrs
  class?: string
  /** for transform */
  matrix?: Matrix | number[]
}

export interface Group extends IMark {
  type: 'group'
  children: Mark[]
}

export interface Circle extends IMark {
  type: 'circle'
  attrs: MarkAttrs & {
    x: number
    y: number
    r: number
  }
}

/**
 * Common mark attrs, borrowed from @antv/g
 */
export type MarkAttrs = {
  /** x 坐标 */
  x?: number
  /** y 坐标 */
  y?: number
  /** 圆半径 */
  r?: number
  /** 描边颜色 */
  stroke?: ColorType
  /** 填充颜色 */
  fill?: ColorType
  /** 整体透明度 */
  opacity?: number
  /** 线宽 */
  lineWidth?: number
  ...
}
```

完整的 `GraphicsIR` 定义请见 [pintora 源码](https://github.com/hikerpig/pintora/blob/master/packages/pintora-core/src/types/graphics.ts)。

Pintora 的渲染层目前使用 [antv/g](https://g.antv.vision/zh/docs/guide/introduce) ，可输出 canvas 和 svg 两种格式。因此 `GraphicsIR` 目前的定义与 `antv/g` 基本一致，同时你也会发现许多术语与 SVG 定义相似。

为了构建出图表完整的视觉表达，artist 需要做的事情有很多，包括生成各种标记、指定颜色、计算布局相关数据等，因此代码量一般是图表实现中最多的部分。

### IDiagram 和 diagramRegistry

`IDiagram` 为一个图表的完整定义接口，实现了该接口的对象在将自己注册进图表集合 `diagramRegistry` 后，Pintora 便可识别和处理图表描述的输入文本，并转化为特定的图像输出。

```ts
export interface IDiagram<D = any, Config = any> {
  /**
   * A pattern used to detect if the input text should be handled by this diagram.
   * @example /^\s*sequenceDiagram/
   */ 
  pattern: RegExp
  parser: IDiagramParser<D, Config>
  artist: IDiagramArtist<D, Config>
  configKey?: string
  clear(): void
}

/**
 * Parse input text to DiagramIR
 */ 
export interface IDiagramParser<D, Config = any> {
  parse(text: string, config?: Config): D
}

/**
 * Convert DiagramIR to GraphicsIR
 */ 
export interface IDiagramArtist<D, Config = any> {
  draw(diagramIR: D, config?: Config): GraphicsIR
}
```

注册一个图表：

```ts
import { IDiagram } from '@pintora/core'
import pintora from '@pintora/standalone'

const diagramDefinition: IDiagram = { ... }

pintora.diagramRegistry.registerDiagram(diagramDefinition)
```

## 一些其他细节

### 文本布局

Pintora 使用 `canvas.measureText` 来计算文本的布局参数，在 Node.js 端使用 jsdom 和其底层依赖的 node-canvas 来做这件事情。

### 布局库

对于某些图表类型，计算满足图表逻辑特性，且兼具可读性和美观性的布局绝非易事。参考 Mermaid.js 的实现，Pintora 维护了一份  dagrejs/dagre 的 fork - [@pintora/dagre](https://github.com/hikerpig/dagre-layout)。
