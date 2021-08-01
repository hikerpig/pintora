import { DiagramsConf } from '../type'
import { PALETTE } from '../util/theme'
import { configApi, safeAssign } from '@pintora/core'

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

  textColor: string

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

  textColor: PALETTE.normalDark,

  fontSize: 12,

  useMaxWidth: true,
}

export const conf: ErConf = {
  ...defaultConfig,
}

export function getConf() {
  const globalConfig: DiagramsConf = configApi.getConfig()
  const t = globalConfig.core.themeVariables
  safeAssign(conf, {
    stroke: t.primaryBorderColor,
    fill: t.primaryColor,
    edgeColor: t.primaryColor,
    textColor: t.textColor,
    attributeFill: t.lightestBackground || conf.attributeFill,
  })
  Object.assign(conf, globalConfig.er || {})
  return conf
}
