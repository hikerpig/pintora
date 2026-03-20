import { PALETTE } from '../util/theme'
import { EdgeType, getParamRulesFromConfig, interpreteConfigs, makeConfigurator } from '../util/config'
import { BaseFontConfig, defaultFontConfig, getFontConfigRules } from '../util/font-config'

export type UseCaseConf = BaseFontConfig & {
  diagramPadding: number

  layoutDirection: string
  ranksep: number
  nodesep: number
  edgesep: number

  edgeType: EdgeType
  useMaxWidth: boolean

  actorWidth: number
  actorHeight: number
  actorPaddingX: number
  actorPaddingY: number

  useCasePaddingX: number
  useCasePaddingY: number

  systemBoundaryPadding: number

  borderRadius: number

  actorStroke: string
  actorFill: string
  useCaseStroke: string
  useCaseFill: string
  systemBoundaryStroke: string
  systemBoundaryFill: string
  edgeColor: string

  textColor: string

  labelBackground: string
}

export const defaultUseCaseConf: UseCaseConf = {
  ...defaultFontConfig,
  diagramPadding: 15,

  layoutDirection: 'TB',
  ranksep: 100,
  nodesep: 80,
  edgesep: 80,

  edgeType: 'polyline',
  useMaxWidth: false,

  actorWidth: 60,
  actorHeight: 80,
  actorPaddingX: 10,
  actorPaddingY: 10,

  useCasePaddingX: 15,
  useCasePaddingY: 15,

  systemBoundaryPadding: 20,

  borderRadius: 10,

  actorStroke: PALETTE.normalDark,
  actorFill: PALETTE.white,
  useCaseStroke: PALETTE.normalDark,
  useCaseFill: PALETTE.cyan,
  systemBoundaryStroke: PALETTE.normalDark,
  systemBoundaryFill: 'transparent',
  edgeColor: PALETTE.normalDark,

  textColor: PALETTE.normalDark,

  labelBackground: PALETTE.white,
} as const

export const USECASE_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultUseCaseConf),
  ...getFontConfigRules(),
  useMaxWidth: { valueType: 'boolean' },
  layoutDirection: { valueType: 'string' },
  borderRadius: { valueType: 'size' },
  actorStroke: { valueType: 'color' },
  actorFill: { valueType: 'color' },
  useCaseStroke: { valueType: 'color' },
  useCaseFill: { valueType: 'color' },
  systemBoundaryStroke: { valueType: 'color' },
  systemBoundaryFill: { valueType: 'color' },
  edgeColor: { valueType: 'color' },
  textColor: { valueType: 'color' },
  labelBackground: { valueType: 'color' },
} as const

export const configKey = 'usecase'

const useCaseConfigurator = makeConfigurator<UseCaseConf>({
  defaultConfig: defaultUseCaseConf,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(USECASE_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t, conf) {
    return {
      actorStroke: t.primaryBorderColor,
      actorFill: t.canvasBackground || t.background1,
      useCaseStroke: t.primaryBorderColor,
      useCaseFill: t.primaryColor,
      systemBoundaryStroke: t.primaryBorderColor,
      systemBoundaryFill: 'transparent',
      edgeColor: t.primaryLineColor,
      textColor: t.textColor,
      labelBackground: t.canvasBackground || t.background1,
    }
  },
})

export const getConf = useCaseConfigurator.getConfig
