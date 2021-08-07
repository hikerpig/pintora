import { PALETTE } from '../util/theme'
import { configApi, safeAssign } from '@pintora/core'
import { DiagramsConf } from '../type'

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

  labelBackground: PALETTE.white,

  interfaceSize: 16,
}

export const conf: ComponentConf = {
  ...defaultConfig,
}

export function getConf() {
  const globalConfig: DiagramsConf = configApi.getConfig()
  const t = globalConfig.themeConfig.themeVariables
  safeAssign(conf, {
    componentBackground: t.secondaryColor,
    componentBorderColor: t.primaryColor,
    groupBackground: t.groupBackground,
    groupBorderColor: t.primaryBorderColor,
    relationLineColor: t.primaryColor,
    labelBackground: t.canvasBackground || t.background1,
    textColor: t.textColor,
  })
  Object.assign(conf, globalConfig.component || {})
  return conf
}
