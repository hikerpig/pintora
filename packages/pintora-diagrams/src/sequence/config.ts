import { DEFAULT_FONT_FAMILY, MarkAttrs } from '@pintora/core'
import { PALETTE } from '../util/theme'
import { safeAssign } from '@pintora/core'
import { baseGetConfigFromGlobalConfig, interpreteConfigs, makeConfigurator } from '../util/config'

export type SequenceConf = {
  noteWidth: number
  noteHeight: number
  noteMargin: number
  boxMargin: number
  activationWidth: number
  diagramMarginX: number
  diagramMarginY: number
  boxTextMargin: number

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

  participantBoxPadding: number
  participantBackground: string

  noteTextColor: string

  activationBackground: string

  dividerFontWeight: MarkAttrs['fontWeight']
  dividerTextColor: string
  dividerMargin: number

  showSequenceNumbers: boolean
  useMaxWidth: boolean
}

export const defaultConfig: SequenceConf = {
  noteWidth: 80,
  noteHeight: 50,
  noteMargin: 10,
  boxMargin: 10,
  activationWidth: 10,
  diagramMarginX: 10,
  diagramMarginY: 10,
  boxTextMargin: 5,

  messageFontSize: 16,
  messageFontFamily: DEFAULT_FONT_FAMILY,
  messageFontWeight: 400,
  messageTextColor: PALETTE.normalDark,
  wrapPadding: 10,
  labelBoxWidth: 50,
  labelBoxHeight: 20,

  loopLineColor: PALETTE.orange,

  mirrorActors: true,
  actorWidth: 80,
  actorHeight: 50,
  actorMargin: 10,
  actorBackground: PALETTE.orange,
  actorBorderColor: PALETTE.normalDark,
  actorTextColor: PALETTE.normalDark,
  actorLineColor: PALETTE.normalDark,

  participantBoxPadding: 10,
  participantBackground: 'transparent',

  noteTextColor: PALETTE.normalDark,

  activationBackground: PALETTE.neutralGray,

  dividerFontWeight: 600,
  dividerTextColor: PALETTE.normalDark,
  dividerMargin: 15,

  showSequenceNumbers: false,
  useMaxWidth: false,
}

export const SEQUENCE_PARAM_DIRECTIVE_RULES = {
  noteMargin: { valueType: 'size' },
  boxMargin: { valueType: 'size' },
  activationWidth: { valueType: 'size' },
  diagramMarginX: { valueType: 'size' },
  diagramMarginY: { valueType: 'size' },
  boxTextMargin: { valueType: 'size' },
  messageFontSize: { valueType: 'fontSize' },
  messageFontFamily: { valueType: 'string' },
  messageTextColor: { valueType: 'color' },
  wrapPadding: { valueType: 'size' },
  labelBoxWidth: { valueType: 'size' },
  labelBoxHeight: { valueType: 'size' },
  loopLineColor: { valueType: 'color' },
  actorWidth: { valueType: 'size' },
  actorHeight: { valueType: 'size' },
  actorMargin: { valueType: 'size' },
  actorBackground: { valueType: 'color' },
  actorBorderColor: { valueType: 'color' },
  actorTextColor: { valueType: 'color' },
  actorLineColor: { valueType: 'color' },
  noteTextColor: { valueType: 'color' },
  activationBackground: { valueType: 'color' },
  dividerTextColor: { valueType: 'color' },
  useMaxWidth: { valueType: 'boolean' },
} as const

export const configKey = 'sequence'

const configurator = makeConfigurator<SequenceConf>({
  defaultConfig,
  configKey,
  getConfigFromGlobalConfig(globalConfig, configContext, configKey) {
    return safeAssign({
      ...baseGetConfigFromGlobalConfig(globalConfig, configContext, configKey),
      messageFontFamily: globalConfig.core.defaultFontFamily,
    })
  },
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(SEQUENCE_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t) {
    return {
      actorBackground: t.primaryColor,
      actorBorderColor: t.primaryBorderColor,
      messageTextColor: t.textColor,
      loopLineColor: t.primaryColor,
      actorTextColor: t.textColor,
      actorLineColor: t.primaryLineColor,
      noteTextColor: t.noteTextColor || t.textColor,
      activationBackground: t.background1,
      dividerTextColor: t.secondaryTextColor,
    }
  },
})

export const getConf = configurator.getConfig
