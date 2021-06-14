export type ErConf = {
  diagramPadding: number
  layoutDirection: string

  minEntityWidth: number

  minEntityHeight: number

  entityPadding: number

  stroke: 'gray'
  fill: 'honeydew'

  fontSize: number

  useMaxWidth: boolean
}

export const defaultConfig: ErConf = {
  diagramPadding: 20,
  layoutDirection: 'TB',

  minEntityWidth: 100,

  minEntityHeight: 75,

  entityPadding: 15,

  stroke: 'gray',
  fill: 'honeydew',

  fontSize: 12,

  useMaxWidth: true,
}
