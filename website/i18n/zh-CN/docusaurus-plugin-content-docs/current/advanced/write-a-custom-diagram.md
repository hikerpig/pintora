---
title: 实现你自己的图表
---

此教程将尝试给 Pintora 扩展一个 Mermaid.js 风格的饼图。

![pie chart example](/img/docs/pie.svg)

:::info
你可于 github 查看[此教程的代码](https://github.com/hikerpig/pintora-diagram-pie-chart/tree/archive/simple-regexp-parser)。
:::

:::tip
在实现自定义图表之前，请先了解 Pintora 的[技术简介](./technical-brief.md)。
:::

## 基本语法和 DiagramIR

```text
pie
  title Bag of Fruits
  "apple" 5
  "peach" 6
  "banana" 2
```

1. 以 `pie` 为起始标识
2. `title` 后的内容会作为图表的标题
3. 每一行记录满足 `"<name>" <number>` 的格式，其中 `number` 需要是正数

以下为图表逻辑数据 `PieChartDiagramIR` 的定义。

```ts
export type Item = {
  name: string
  count: number
}

export type PieChartDiagramIR = {
  title: string
  items: Item[]
  sum: number
}
```

## 先看一眼注册图表需要什么

基于以上的语法规则 1，我们可以得出将图表判定为 pieChart 的条件，使用正则表达式 `/^\s*pie\s*\n/` 来描述。pintora 会根据按照图表的注册顺序，使用其提供的 `pattern` 对输入文本进行检查，使用第一个匹配的图表来进行后续的处理。

`parser` 和 `artist` 我们还没有实现，将在下文中说明。

```ts
import { IDiagram } from '@pintora/core'
import pintora from '@pintora/standalone'
import { PieChartDiagramIR } from './type'
import parser from './parser'
import artist from './artist'

const pieChartDiagram: IDiagram<PieChartDiagramIR> = {
  pattern: /^\s*pie\s*\n/,
  parser,
  artist,
}

pintora.diagramRegistry.registerDiagram('pieChart', pieChartDiagram)
```

## 语法解析器 parser

由于语法真的很简单，我们可以使用基于行内容匹配的正则表达式快速实现 parser:

- `TITLE_REGEXP` 对应于语法规则 2
- `RECORD_REGEXP` 对应于语法规则 3
  - 目前只接受双引号内的内容作为记录名
  - 接受简单的正数，可以带有小数点，不支持科学计数法

```ts
import { IDiagramParser } from '@pintora/core'
import { PieChartDiagramIR, Item } from './type'

const TITLE_REGEXP = /^title\s*(.*)/
const RECORD_REGEXP = /^\"(.*)\"\s+([\d\.]+)/

const parser: IDiagramParser<PieChartDiagramIR> = {
  parse(input: string) {
    const ir: PieChartDiagramIR = {
      title: '',
      items: [],
      sum: 0,
    }

    const lines = input.split('\n')
    for (const line of lines) {
      let match
      const trimmedLine = line.trim()
      if (match = TITLE_REGEXP.exec(trimmedLine)) {
        ir.title = match[1]
        continue
      }
      if (match = RECORD_REGEXP.exec(trimmedLine)) {
        const item: Item = {
          name: match[1],
          count: parseFloat(match[2]),
        }
        ir.items.push(item)
        continue
      }
    }

    ir.sum = ir.items.reduce((sum, item) => sum + item.count, 0)

    return ir
  }
}

export default parser
```

### 进阶: 使用 nearley.js 生成 parser

Pintora 的内置图表使用 nearley.js 作为 parser generator，有一些通用的语法片段（例如 `@param` 和 `@config` 指令），关于如何使用 nearley.js 和复用语法规则，今后会写另一篇教程来阐述。

[pintora-diagram-pie-chart 的最新代码](https://github.com/hikerpig/pintora-diagram-pie-chart/blob/master/src/parser/pieChart.ne) 使用一个 fork 了的 [nearley 版本](https://github.com/hikerpig/nearley) 来生成 parser。

## 艺术家 artist

artist 的代码量一般是图表实现中最多的部分，我们将步步分解。

### 基础结构

artist 负责将 parser 生成的 `diagramIR` 转换为视觉表达格式 `GraphicsIR`，因此实现的头和尾如下所示。

```ts
import { IDiagramArtist, GraphicsIR, Group } from '@pintora/core'
import pintora, { IFont } from '@pintora/standalone'
import { PieChartDiagramIR } from './type'

const pieChartArtist: IDiagramArtist<PieChartDiagramIR> = {
  draw(diagramIR) {
    const rootMark: Group = {
      type: 'group',
      children: [],
    }

    // ... TBD

    const graphicsIR: GraphicsIR = {
      mark: rootMark,
      width,
      height,
      bgColor,
    }
    return graphicsIR
  },
}

export default pieChartArtist
```

同时声明以下作为基础的图表配置，绘制元素的时候会使用。

```ts
const PIE_COLORS = [
  '#ecb3b2',
  '#efc9b3',
  '#f5f6b8',
  '#c6f4b7',
  '#bce6f5',
  '#cdb2f2',
  '#ecb4ee',
]

const LEGEND_SQUARE_SIZE = 20
const LEGEND_FONT: IFont = {
  fontSize: 14,
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
}

type PieConf = {
  diagarmPadding: number
  diagramBackgroundColor: string
  circleRadius: number
}

const conf: PieConf = {
  diagarmPadding: 10,
  diagramBackgroundColor: '#F9F9F9',
  circleRadius: 150,
}
```

### 绘制标题

- 标题文字基于自身水平居中（通过 `textAlign: 'center'` 实现），且 `x` 与之后会绘制的饼图圆心相同
- 标题的存在，会影响饼图的垂直位置，我们使用 `circleStartY` 标记饼图在垂直方向上的起始位置

```ts
    const radius = conf.circleRadius

    let circleStartY = conf.diagarmPadding
    let circleStartX = conf.diagarmPadding

    if (diagramIR.title) {
      const titleMark = pintora.util.makeMark('text', {
        text: diagramIR.title,
        x: circleStartX + radius,
        y: circleStartY + 10,
        fill: 'black',
        fontSize: 16,
        fontWeight: 'bold',
        textBaseline: 'middle',
        textAlign: 'center',
      })
      rootMark.children.push(titleMark)
      circleStartY += 30
    }
```

### 绘制每条记录

这一部分较为繁琐，简单概括，每条记录包括饼图中的扇形以及右边的图例（legend），因此对应每一部分，都需要：

- 绘制扇形区域，角度与记录的数字在总体 `sum` 中的占比成正比，以下使用 `sectorMark` 表示。它是一个 `Path` 类型的标记，形状由 `path` 描述，关于路径的语法，可以查看文档 [Paths - SVG: Scalable Vector Graphics | MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths)。
- `pLabel` 是一个文本类型的标记，在扇形区域中显示该区域相关的百分比。
- `legendSquare` 为与扇形颜色相同的小方块，在饼图右侧的图例区域显示。
- `legendLabel` 出现在 `legendSquare` 右侧，显示图例的名字。
- 在计算布局时，使用了 `pintora.util.calculateTextDimensions(text, fontConfig)` 来计算文本的视觉区域大小，用于决定后续元素的摆放位置。

生成完单条记录需要的所有标记后，将它们归至 `itemGroup` 中，再将 `itemGroup` 添加进 `rootMark.children` 里。`Group` 可以根据需求做合适的嵌套，合理的分组一方面方便调试，另一方面可以使用一些特殊字段，例如 `group.matrix` 对整个组做几何变换。

注意到 `itemGroup` 上的 `class` 属性，它在 SVG 输出时会带上，也是方便调试的一个小技巧。

```ts
    diagramIR.items.forEach((item, i) => {
      const fillColor = PIE_COLORS[i % PIE_COLORS.length]
      const rad = (item.count / diagramIR.sum) * RAD_OF_A_CIRCLE
      const destRad = currentRad + rad
      const arcStartX = radius * Math.cos(currentRad)
      const arcStartY = radius * Math.sin(currentRad)
      const arcEndRel = {
        x: radius * Math.cos(destRad),
        y: radius * Math.sin(destRad),
      }
      const largeArcFlag = rad > Math.PI ? 1 : 0
      const sectorMark = pintora.util.makeMark('path', {
        path: [
          ['M', circleCenter.x, circleCenter.y],
          ['l', arcStartX, arcStartY],
          [
            'a',
            radius,
            radius,
            currentRad,
            largeArcFlag,
            1,
            arcEndRel.x - arcStartX,
            arcEndRel.y - arcStartY,
          ],
          ['Z'],
        ],
        stroke: '#333',
        fill: fillColor,
      })

      // draw percentage label
      const pLabelX =
        circleCenter.x + (radius * Math.cos(currentRad + rad / 2)) / 2
      const pLabelY =
        circleCenter.y + (radius * Math.sin(currentRad + rad / 2)) / 2
      const pLabel = pintora.util.makeMark('text', {
        text: `${Math.floor((100 * item.count) / diagramIR.sum)}%`,
        fill: 'black',
        x: pLabelX,
        y: pLabelY,
        textAlign: 'center',
        textBaseline: 'middle',
      })

      // draw legend
      const legendSquare = pintora.util.makeMark('rect', {
        fill: fillColor,
        width: LEGEND_SQUARE_SIZE,
        height: LEGEND_SQUARE_SIZE,
        x: legendStart.x,
        y: currentLabelY,
      })

      const labelX = legendStart.x + LEGEND_SQUARE_SIZE + 5
      const legendLabel = pintora.util.makeMark('text', {
        text: item.name,
        fill: 'black',
        x: labelX,
        y: currentLabelY,
        ...(LEGEND_FONT as any),
        textBaseline: 'top',
      })

      currentRad = destRad
      currentLabelY += LEGEND_SQUARE_SIZE + 5

      const labelDims = pintora.util.calculateTextDimensions(
        item.name,
        LEGEND_FONT
      )
      maxLabelRight = Math.max(maxLabelRight, labelX + labelDims.width)

      const itemGroup: Group = {
        type: 'group',
        children: [sectorMark, pLabel, legendSquare, legendLabel],
        class: 'pie__item'
      }
      rootMark.children.push(itemGroup)
    })
```

### 计算图表的最终大小

到这里，最终的 `graphicsIR` 所需数据便全部完成了。

```ts
    const diagramWidth = maxLabelRight + conf.diagarmPadding

    const graphicsIR: GraphicsIR = {
      mark: rootMark,
      width: diagramWidth,
      height: circleStartY + 2 * radius + conf.diagarmPadding,
      bgColor: conf.diagramBackgroundColor,
    }
```

## 下一步: 给图表加上可配置项

关于配置的基本概念，请参阅 [Config 相关文档](configuration/config.md)。

通过 Typescript 的类型增强特性，你可以扩展 `@pintora/core` 包中的 `interface PintoraConfig`，给这个类型加上一些饼图特有的配置项，使用 `pie` 作为键名来存取。

```ts
declare module '@pintora/core' {
  interface PintoraConfig {
    pie: {
      diagarmPadding: number
      diagramBackgroundColor: string
      circleRadius: number
      pieColors: string[]
    }
  }
}
```

### 设置默认配置

在注册图表时，使用 `pintora.setConfig({ pie: { ...defaultConfig } })` 来给 `pie` 设置默认值。

```diff
import pintora, { IFont, PintoraConfig } from '@pintora/standalone'
 import { PieChartDiagramIR } from './type'
 
-const PIE_COLORS = [
+const DEFAULT_PIE_COLORS = [
   '#ecb3b2',
   '#efc9b3',
   '#f5f6b8',
@@ -19,21 +19,25 @@ const LEGEND_FONT: IFont = {
   fontWeight: 'normal',
 }
 
-type PieConf = {
-  diagarmPadding: number
-  diagramBackgroundColor: string
-  circleRadius: number
-}
+type PieConf = PintoraConfig['pie']
 
-const conf: PieConf = {
+// default config
+const defaultConfig: PieConf = {
   diagarmPadding: 10,
   diagramBackgroundColor: '#F9F9F9',
   circleRadius: 150,
+  pieColors: DEFAULT_PIE_COLORS
 }
 
+pintora.setConfig({
+  pie: { ...defaultConfig },
+})
+
```

### 更改 artist

此时 `draw` 方法从 `PIE_COLORS` 改为 `conf.pieColors`。

```diff
-  draw(diagramIR) {
+  draw(diagramIR, config) {
+    const conf: PieConf = Object.assign({}, pintora.getConfig().pie, config || {})
+
     const rootMark: Group = {
       type: 'group',
       children: [],
@@ -74,7 +78,7 @@ const pieChartArtist: IDiagramArtist<PieChartDiagramIR> = {
     let currentLabelY = legendStart.y
     let maxLabelRight = 0
     diagramIR.items.forEach((item, i) => {
-      const fillColor = PIE_COLORS[i % PIE_COLORS.length]
+      const fillColor = conf.pieColors[i % conf.pieColors.length]
```

### 测试更改全局配置的效果

假设你在渲染图表之前，通过以下方式来更改了部分设定。那么下次再渲染的时候，artist 就会画出一个半径 300

```ts
pintora.default.setConfig({
  pie: {
    circleRadius: 300,
  }
})
```

## 测试图表

我们使用任意 bundler 将此图表的源码打包为 `dist/pintora-diagram-pie-chart.umd.js`，可以在 html 页面中简单测试一下效果。

`pintora-diagram-pie-chart.umd.js` 会将自定义图表注册到 pintora，请确保全局的 `pintora` 对象在自定义图表脚本加载前已经加载。


```html
  <section>
    <div className="pintora">
      pie
        title Bag of Fruits
        "apple" 5
        "peach" 6
        "banana" 2
    </div>
  </section>

  <script src="https://cdn.jsdelivr.net/npm/@pintora/standalone/lib/pintora-standalone.umd.js"></script>
  <script src="./dist/pintora-diagram-pie-chart.umd.js"></script>
  <script>
    pintora.default.initBrowser()
  </script>
```

## 看看效果

前往 [stackblitz 上的在线开发 demo](https://stackblitz.com/edit/pintora-diagram-pie-chart?file=README.md) 查看效果.
