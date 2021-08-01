import { PALETTE } from '../util/theme'

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

  interfaceSize: number
}

export const defaultConfig: ComponentConf = {
  diagramPadding: 15,

  componentPadding: 15,
  componentBackground: PALETTE.yellow,
  componentBorderColor: PALETTE.orange,

  groupBackground: PALETTE.white,
  groupBorderColor: PALETTE.normalDark,

  relationLineColor: PALETTE.orange,
  textColor: PALETTE.normalDark,
  fontSize: 14,
  lineWidth: 2,

  interfaceSize: 16,
}

export const conf: ComponentConf = {
  ...defaultConfig,
}
