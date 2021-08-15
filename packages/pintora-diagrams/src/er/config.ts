import { DiagramsConf } from '../type'
import { PALETTE } from '../util/theme'
import { configApi, safeAssign } from '@pintora/core'

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

  useMaxWidth: boolean
}

export const defaultConfig: ErConf = {
  diagramPadding: 15,
  layoutDirection: 'TB',

  minEntityWidth: 90,

  minEntityHeight: 50,

  entityPaddingX: 15,
  entityPaddingY: 15,

  borderRadius: 2,

  stroke: PALETTE.normalDark,
  fill: PALETTE.orange,
  // fill: 'transparent', // for debugging markers
  edgeColor: PALETTE.normalDark,
  attributeFill: '#fffbf9',

  textColor: PALETTE.normalDark,

  labelBackground: PALETTE.white,

  fontSize: 14,

  useMaxWidth: true,
}

export const conf: ErConf = {
  ...defaultConfig,
}

export function getConf() {
  const globalConfig: DiagramsConf = configApi.getConfig()
  const t = globalConfig.themeConfig.themeVariables
  safeAssign(conf, {
    stroke: t.primaryBorderColor,
    fill: t.primaryColor,
    edgeColor: t.primaryLineColor,
    textColor: t.textColor,
    labelBackground: t.canvasBackground || t.background1,
    attributeFill: t.lightestBackground || conf.attributeFill,
  })
  Object.assign(conf, globalConfig.er || {})
  return conf
}
