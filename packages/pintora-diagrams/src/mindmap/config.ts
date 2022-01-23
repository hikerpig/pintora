import { PALETTE } from '../util/theme'
import { configApi, safeAssign, PintoraConfig } from '@pintora/core'
import { interpreteConfigs, ConfigParam } from '../util/style'

export type MindmapConf = {
  diagramPadding: number
  layoutDirection: 'LR' | 'TB'

  // curvedEdge: boolean

  borderRadius: number

  nodeBgColor: string
  nodePadding: number

  textColor: string
  edgeColor: string

  maxFontSize: number
  minFontSize: number

  levelDistance: number

  l1NodeBgColor: string
  l1NodeTextColor: string
  l2NodeBgColor: string
  l2NodeTextColor: string
}

export const defaultConfig: MindmapConf = {
  diagramPadding: 15,
  layoutDirection: 'LR',

  // curvedEdge: true,

  borderRadius: 4,

  nodeBgColor: PALETTE.orangeLight2,
  nodePadding: 10,

  textColor: PALETTE.normalDark,
  edgeColor: PALETTE.normalDark,

  maxFontSize: 18,
  minFontSize: 14,

  levelDistance: 40,

  l1NodeBgColor: PALETTE.orange,
  l1NodeTextColor: PALETTE.normalDark,
  l2NodeBgColor: PALETTE.orangeLight1,
  l2NodeTextColor: PALETTE.normalDark,
}

export const MINDMAP_CONFIG_DIRECTIVE_RULES = {
  // curvedEdge: { valueType: 'boolean' },
  diagramPadding: { valueType: 'size' },
  layoutDirection: { valueType: 'layoutDirection' },
  borderRadius: { valueType: 'size' },
  nodeBgColor: { valueType: 'color' },
  nodePadding: { valueType: 'size' },
  textColor: { valueType: 'color' },
  edgeColor: { valueType: 'color' },
  maxFontSize: { valueType: 'size' },
  minFontSize: { valueType: 'size' },
  levelDistance: { valueType: 'size' },
  l1NodeBgColor: { valueType: 'color' },
  l1NodeTextColor: { valueType: 'color' },
  l2NodeBgColor: { valueType: 'color' },
  l2NodeTextColor: { valueType: 'color' },
} as const

export function getConf(configParams: ConfigParam[]) {
  const globalConfig: PintoraConfig = configApi.getConfig()
  const t = globalConfig.themeConfig?.themeVariables
  const conf: MindmapConf = { ...defaultConfig }
  if (t) {
    safeAssign(conf, {})
  }
  safeAssign(conf, globalConfig.mindmap || {})
  safeAssign(conf, interpreteConfigs(MINDMAP_CONFIG_DIRECTIVE_RULES, configParams))
  return conf
}
