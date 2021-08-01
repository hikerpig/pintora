import { PALETTE } from '../util/theme'

export type ErConf = {
  diagramPadding: number
  layoutDirection: string

  minEntityWidth: number
  minEntityHeight: number

  entityPadding: number

  stroke: string
  fill: string
  edgeColor: string
  attributeFill: string

  fontSize: number

  useMaxWidth: boolean
}

export const defaultConfig: ErConf = {
  diagramPadding: 20,
  layoutDirection: 'TB',

  minEntityWidth: 90,

  minEntityHeight: 75,

  entityPadding: 15,

  stroke: PALETTE.normalDark,
  fill: PALETTE.orange,
  // fill: 'transparent', // for debugging markers
  edgeColor: PALETTE.normalDark,
  attributeFill: '#fffbf9',

  fontSize: 12,

  useMaxWidth: true,
}

export const conf: ErConf = {
  ...defaultConfig,
}
