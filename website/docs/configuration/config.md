---
title: Config
---

Assume you are using the UMD bundle in the browser, here is an easy example of setting default renderer to CanvasRenderer by using `setConfig` method.

```js
pintora.default.setConfig({
  core: {
    defalutRenderer: 'canvas'
  }
})
```

Or get current config by:

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

  relationLineColor: string
  textColor: string
  fontSize: number
  lineWidth: number

  labelBackground: string

  interfaceSize: number
}
```
