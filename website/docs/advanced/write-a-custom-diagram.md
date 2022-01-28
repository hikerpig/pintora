---
title: Write a custom diagram
---

This tutorial will try to extend a Mermaid.js-style pie chart diagram to Pintora.

![pie chart example](/img/docs/pie.svg)

:::info
You can check out [the code for this tutorial](https://github.com/hikerpig/pintora-diagram-pie-chart) on github.
:::

:::tip
Before implementing custom diagrams, please learn about Pintora's [technical brief](./technical-brief.md).
:::

## Baisic syntax and DiagramIR

```text
pie
  title Bag of Fruits
  "apple" 5
  "peach" 6
  "banana" 2
```

1. the diagram description starts with `pie`
2. the content after `title` will be the title of the diagram
3. each row satisfies the `"<name>" <number>` format, where `number` needs to be a positive number

The following is the definition of the logical diagram data `PieChartDiagramIR`.

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

## First glance at what is needed to register a diagram type

Based on syntax rule 1 above, we can derive the conditions for determining a diagram as a pieChart, described using the regular expression `/^\s*pie\s*\n/`. pintora will check the input text using the `pattern` it provides according to the order in which the diagrams are registered, using the first matching diagram for subsequent processing.

`parser` and `artist` we have not yet implemented, and will describe them in the following.

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

## The parser

Since the syntax is really simple, we can quickly implement a parser using regular expressions based on line content matching:

- `TITLE_REGEXP` corresponds to syntax rule 2
- `RECORD_REGEXP` corresponds to syntax rule 3
  - Currently we only accepts the contents of double quotes as item names
  - Accepts simple positive numbers with decimal points, does not support scientific notation

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

## The artist

The amount of code for artist is usually the largest part of the diagram implementation, so we will break it down step by step.

### Basic structure

The artist is responsible for converting the parser-generated `diagramIR` into the visual representation format `GraphicsIR`, so the start and end of the implementation are shown below.

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

Also declare the following as the base diagram configuration that will be used when drawing the elements.

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

### Draw the title

- The title text is centered horizontally based on itself (achieved with `textAlign: 'center'`), and `x` is the same as the center of the pie chart that will be drawn later
- The presence of the title affects the vertical position of the pie chart, and we use `circleStartY` to mark the starting position of the pie chart in the vertical direction

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

### Draw each item

This part is tedious with details, it can be summarized as: each item includes the sectors in the pie chart as well as the legend on the right, so corresponding to each part, it is necessary to:

- Plot the sector with an angle proportional to the number of items in the overall `sum`, denoted hereafter by `sectorMark`. It is a `Path` type marker, and the shape is described by `path`. For the syntax of paths, see the document [Paths - SVG: Scalable Vector Graphics | MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/ Tutorial/Paths).
- `pLabel` is a text type label that displays the percentage associated with the area in the sector.
- `legendSquare` is a small square of the same color as the sector, displayed in the legend area to the right of the pie chart.
- `legendLabel` appears to the right of `legendSquare` and shows the name of the legend.
- When calculating the layout, `pintora.util.calculateTextDimensions(text, fontConfig)` is used to calculate the size of the visual area of the text, which is used to determine the placement of subsequent elements.

After generating all the tags needed for a single item, group them into `itemGroup` and add `itemGroup` to `rootMark.children`. The `Group` can be nested appropriately according to your needs. A reasonable grouping is convenient for debugging on the one hand, and on the other hand you can use some special fields, such as `group.matrix` to do geometric transformations on the whole group.

Notice the `class` attribute on `itemGroup`, which will be carried in the SVG output and is also a little trick to facilitate debugging.

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
      const sectorMark = pintora.util.makeMark('path', {
        path: [
          ['M', circleCenter.x, circleCenter.y],
          ['l', arcStartX, arcStartY],
          [
            'a',
            radius,
            radius,
            currentRad,
            0,
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

### Calculate the final size of the diagram

At this point, the final `graphicsIR` is complete with all the required data.

```ts
    const diagramWidth = maxLabelRight + conf.diagarmPadding

    const graphicsIR: GraphicsIR = {
      mark: rootMark,
      width: diagramWidth,
      height: circleStartY + 2 * radius + conf.diagarmPadding,
      bgColor: conf.diagramBackgroundColor,
    }
```

## Next step: Adding config to the diagram

For basic concepts of config, see the [Configuration documentation](configuration/config.md).

With Typescript's type enhancement feature, you can extend the `interface PintoraConfig` in the `@pintora/core` package to add some pie-chart specific configs, and can be saved and accessed by the key `pie`.

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

### Set the default config for your diagram

Before registering the diagram, use `pintora.setConfig({ pie: { ...defaultConfig } })` to set the default config for `pie`.

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

### Some changes to the artist

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

## Testing the diagram

We can use any bundler to package the source code of this diagram as `dist/pintora-diagram-pie-chart.umd.js`, which can be tested in an html page to see the effect.

```html
  <section>
    <div class="pintora">
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
