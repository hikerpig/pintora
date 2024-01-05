---
title: Config
---

## Config API

Assume you are using the UMD bundle in the browser, here is an easy example of setting default renderer to CanvasRenderer by using `setConfig` method.

```js
pintora.default.setConfig({
  core: {
    defalutRenderer: 'canvas',
    defaultFontFamily: 'Menlo',
  },
  sequence: {
    messageFontSize: 16,
  },
})
```

Or get current config by `getConfig`:

```ts
pintora.default.getConfig()
```

## Apply config to just one render

When using `@pintora/standalone` in the browser, you can apply config to just one render. This will not change the globalConfig.

```ts
pintora.default.renderTo(code, {
  container,
  config: {
    themeConfig: {
      theme: 'dark',
    }
  }
})
```

## Available configs

```ts
export type PintoraConfig = {
  core: {
    /** by default it's 'svg' */
    defaultRenderer: string
    defaultFontFamily: string
    useMaxWidth: boolean
  }
  themeConfig: {
    theme: string
    darkTheme?: string
    themeVariables: ITheme
  }
  activity: ActivityConf
  component: ComponentConf
  er: ErConf
  sequence: SequenceConf
}
```

## Config for diagrams

### Common Configs

There are some common diagram config keys those - if they appears in the `*Conf` below - share common meaning and possible values.

| name            | value type             | description                                                        |
|-----------------|------------------------|--------------------------------------------------------------------|
| layoutDirection | 'TB' or 'LR'           | A config for dagre-layout, stands for (top-bottom) or (left-right) |
| diagramPadding  | number                 | Padding of the diagram, distance from visual content to the border |
| useMaxWidth     | boolean                | Whether the diagram should be resized to fit container width       |
| edgeType        | [EdgeType](#edge-type) | Edge splines type                                                  |

#### EdgeType

- `polyline`, this is the default value
- `ortho`, stands for orthogonal, edges are axis-aligned and bendings are right-angled
- `curved`, similar to 'polyline' control points, but draws curved line instead of straight one

![edge type demo](https://i.imgur.com/9v3toF1.png)

### sequence

Config for sequence diagram. For more detail, check the [latest code](https://github.com/hikerpig/pintora/blob/master/packages/pintora-diagrams/src/sequence/config.ts).

```ts
export type SequenceConf = {
  noteWidth: number
  noteHeight: number
  noteMargin: number
  boxMargin: number
  activationWidth: number
  diagramMarginX: number
  diagramMarginY: number
  boxTextMargin: number

  messageFontFamily: string
  messageFontSize: number
  messageFontWeight: MarkAttrs['fontWeight']
  messageTextColor: string
  /**
   * font weight of box - such as loop and box
   */
  boxFontWeight: MarkAttrs['fontWeight']
  wrapPadding: number
  labelBoxWidth: number
  labelBoxHeight: number

  /** color of loop box's border */
  loopLineColor: string

  /** if the actor should also appear in the bottom of the diagram, default is true */
  mirrorActors: boolean
  actorWidth: number
  actorHeight: number
  actorMargin: number

  actorBackground: string
  actorBorderColor: string
  actorTextColor: string
  actorLineColor: string

  participantBoxPadding: number
  participantBackground: string

  noteTextColor: string

  activationBackground: string

  dividerFontWeight: MarkAttrs['fontWeight']
  dividerTextColor: string
  dividerMargin: number

  showSequenceNumbers: boolean
  useMaxWidth: boolean
}
```

### er

Config for entity relationship diagram. For more detail, check the [latest code](https://github.com/hikerpig/pintora/blob/master/packages/pintora-diagrams/src/er/config.ts).

```ts
export type ErConf = {
  diagramPadding: number

  layoutDirection: string
  ranksep: number
  edgesep: number

  edgeType: EdgeType
  useMaxWidth: boolean

  minEntityWidth: number
  minEntityHeight: number

  entityPaddingX: number
  entityPaddingY: number
  borderRadius: number

  stroke: string
  fill: string
  edgeColor: string
  attributeFill: string

  textColor: string

  labelBackground: string

  fontSize: number
  fontFamily: string
}
```

### component

Config for component diagram. For more detail, check the [latest code](https://github.com/hikerpig/pintora/blob/master/packages/pintora-diagrams/src/component/config.ts).

```ts
export type ComponentConf = {
  diagramPadding: number

  edgeType: EdgeType
  edgesep: number
  ranksep: number

  componentPadding: number
  componentBackground: string
  componentBorderColor: string

  groupBackground: string
  groupBorderColor: string
  groupBorderWidth: number

  relationLineColor: string
  textColor: string
  fontSize: number
  fontFamily: string
  lineWidth: number

  labelBackground: string

  interfaceSize: number

  useMaxWidth: boolean

  /**
   * By default there is a label in bottom-left of group to show its type, set this to true make the label disappear
   */
  hideGroupType: boolean
}
```

### activity

```ts
export type ActivityConf = {
  diagramPadding: number

  edgesep: number
  edgeType: EdgeType
  useMaxWidth: boolean

  actionPaddingX: number
  actionPaddingY: number

  actionBackground: string
  actionBorderColor: string

  groupBackground: string
  groupBorderColor: string

  textColor: string
  edgeColor: string

  keywordBackground: string

  noteTextColor: string
  noteMargin: number

  labelTextColor: string
  labelBackground: string

  fontSize: number
  fontFamily: string
}
```

### mindmap

```ts
export type MindmapConf = {
  diagramPadding: number
  layoutDirection: 'LR' | 'TB'

  useMaxWidth: boolean

  borderRadius: number

  /** default node color */
  nodeBgColor: string
  nodePadding: number
  /** font weight of node label */
  nodeFontWeight: MarkAttrs['fontWeight']

  textColor: string
  edgeColor: string

  maxFontSize: number
  minFontSize: number
  fontFamily: string

  levelDistance: number

  // node config for different levels
  l1NodeBgColor: string
  l1NodeTextColor: string
  l2NodeBgColor: string
  l2NodeTextColor: string
}
```

### gantt

Config for gantt diagram. For more detail, check the [latest code](https://github.com/hikerpig/pintora/blob/master/packages/pintora-diagrams/src/gantt/config.ts).

```ts
export type GanttConf = {
  barHeight: number
  barGap: number
  topPadding: number
  sidePadding: number
  gridLineStartPadding: number

  numberSectionStyles: number

  axisFormat: DateFormat
  axisLabelFontSize: number
  axisLabelColor: string
  gridLineWidth: number
  gridLineColor: string

  markLineColor: string

  barBackground: string
  barBorderColor: string
  barBorderRadius: number

  sectionBackgrounds: Array<string | undefined>
  sectionLabelColor: string

  fontColor: string
  fontSize: number
  fontFamily: string
}
```

### dot

Config for DOT diagram. For more detail, check the [latest code](https://github.com/hikerpig/pintora/blob/master/packages/pintora-diagrams/src/dot/config.ts).

```ts
export type DOTConf = {
  diagramPadding: number

  layoutDirection: string
  ranksep: number
  nodesep: number
  edgesep: number
  edgeType: EdgeType

  nodePadding: number
  nodeBorderRadius: number

  backgroundColor: string

  labelTextColor: string
  nodeBorderColor: string
  edgeColor: string

  fontSize: number
  fontWeight: MarkAttrs['fontWeight']
  fontFamily: string
}
```

## Override config by directive

If you don't have the access to add JS script into the page or in the Node.js module, it's also possible to override some configs of the builtin diagrams through the `@param` or `@config` directive.

:::info
This is the recommended way to override configs inside the text DSL for all pintora's builtin diagrams.
But it may be slightly different or not implemented at all in some third-party diagrams, due to syntax confilict or other diagram-parser implementation details.
:::

### The `@param` directive

This directive overrides local config in current diagram.

Syntax:

```text
@param prop value

%% --- or ---

@param {
  prop value
}
```

For example:

```pintora play
sequenceDiagram
  @param loopLineColor #79caf1
  @param actorBackground #61afef
  @param actorTextColor #ffffff
  @param {
    messageFontFamily Consolas
    dividerTextColor #61afef
  }
  User->>Pintora: render this
  activate Pintora
  loop Check input
    Pintora-->>Pintora: Has input changed?
  end
```

### The `@config` directive

Unlike the `@param` directive, this directive:

1. Overrides global config in this render.
2. Config needs to be valid JSON string.

Syntax:

```text
@config(...configJSON)
```

For example:

```pintora play
mindmap
@config({
  "core": {
    "defaultFontFamily": "serif",
    "useMaxWidth": true
  },
  "themeConfig": {
    "theme": "larkDark"
  },
  "mindmap": {
    "layoutDirection":   "TB",
      "l1NodeBgColor":   "#2B7A5D",
      "l1NodeTextColor": "#fff",
      "l2NodeBgColor":   "#26946C",
      "l2NodeTextColor": "#fff",
      "nodeBgColor":     "#67B599",
      "textColor":       "#fff"
  }
})

+ UML Diagrams
++ Behavior Diagrams
+++ Sequence Diagram
+++ State Diagram
+++ Activity Diagram
++ Structural Diagrams
+++ Class Diagram
+++ Component Diagram
```
