---
title: Config
---

## Config API

Assume you are using the UMD bundle in the browser, here is an easy example of setting default renderer to CanvasRenderer by using `setConfig` method.

```js
pintora.default.setConfig({
  core: {
    defalutRenderer: 'canvas'
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

## Available configs

```ts
export type DiagramsConf = {
  themeConfig: {
    theme: string
    darkTheme?: string
    themeVariables: ITheme
  }
  component: ComponentConf
  er: ErConf
  sequence: SequenceConf
}

type DiagramsConf = {
  themeConfig: {
    theme: string
    darkTheme?: string
    themeVariables: ITheme
  }
  component: ComponentDiagramIR
  er: ErDiagramIR
  sequence: SequenceDiagramIR
}

type PintoraConfig = DiagramsConf & {
  core: {
    /** by default it's 'svg' */
    defaultRenderer: string
  }
}
```

## DiagramsConf

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
  boxTextMargin: number;

  messageFontFamily: string
  messageFontSize: number
  messageFontWeight: MarkAttrs['fontWeight']
  messageTextColor: string
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

  noteTextColor: string

  activationBackground: string

  dividerFontWeight: MarkAttrs['fontWeight']

  showSequenceNumbers: boolean
}
```

### er

Config for entity relationship diagram. For more detail, check the [latest code](https://github.com/hikerpig/pintora/blob/master/packages/pintora-diagrams/src/er/config.ts).

```ts
export type ErConf = {
  diagramPadding: number
  layoutDirection: string

  curvedEdge: boolean

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
}
```

### component

Config for component diagram. For more detail, check the [latest code](https://github.com/hikerpig/pintora/blob/master/packages/pintora-diagrams/src/component/config.ts).

```ts
export type ComponentConf = {
  diagramPadding: number

  componentPadding: number
  componentBackground: string
  componentBorderColor: string

  groupBackground: string
  groupBorderColor: string
  groupBorderWidth: number

  relationLineColor: string
  textColor: string
  fontSize: number
  lineWidth: number

  labelBackground: string

  interfaceSize: number
}
```

### activity

```ts
export type ActivityConf = {
  diagramPadding: number

  edgesep: number
  curvedEdge: boolean

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
}
```

## The `@style` directive

If you don't have the access to add JS script into the page or in the Node.js module, it's also possible to override some configs of the builtin diagrams through the `@style` directive.

:::info
This is the recommended way to override configs inside the text DSL for all pintora's builtin diagrams.
But it may be slightly different or not implemented at all in some third-party diagrams, due to syntax confilict or other diagram-parser implementation details.
:::

Syntax:

```text
@style prop value

# --- or ---

@style {
  prop value
}
```

For example:

```pintora play
sequenceDiagram
  @style loopLineColor #79caf1
  @style actorBackground #61afef
  @style actorTextColor #ffffff
  @style {
    messageFontFamily Consolas
    dividerTextColor #61afef
  }
  User->>Pintora: render this
  activate Pintora
  loop Check input
    Pintora-->>Pintora: Has input changed?
  end
```
