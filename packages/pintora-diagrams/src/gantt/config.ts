import { PALETTE } from '../util/theme'
import { DEFAULT_FONT_FAMILY, tinycolor } from '@pintora/core'
import { interpreteConfigs, makeConfigurator, getParamRulesFromConfig } from '../util/config'
import { DateFormat } from './type'

export type GanttConf = {
  diagramPadding: number

  barHeight: number
  barGap: number
  topPadding: number
  sidePadding: number
  gridLineStartPadding: number

  numberSectionStyles: number

  axisFormat: DateFormat
  axisLabelFontSize: number
  axisLabelColor: string
  gridLineWidth: number
  gridLineColor: string

  markLineColor: string

  barBackground: string
  barBorderColor: string
  barBorderRadius: number

  sectionBackgrounds: Array<string | undefined>
  sectionLabelColor: string

  fontColor: string
  fontSize: number
  fontFamily: string
}

export const defaultConfig: GanttConf = {
  diagramPadding: 15,

  barHeight: 20,
  barGap: 2,
  topPadding: 30,
  sidePadding: 20,
  gridLineStartPadding: 20,

  numberSectionStyles: 4,

  axisFormat: 'YY-MM-DD',
  axisLabelFontSize: 10,
  gridLineWidth: 2,
  gridLineColor: PALETTE.normalDark,
  axisLabelColor: PALETTE.normalDark,

  markLineColor: PALETTE.pink,

  barBackground: PALETTE.orange,
  barBorderColor: PALETTE.normalDark,
  barBorderRadius: 2,

  sectionBackgrounds: ['#fff0da', undefined], // will be infered from theme
  sectionLabelColor: PALETTE.normalDark,

  fontColor: PALETTE.normalDark,
  fontSize: 14,
  fontFamily: DEFAULT_FONT_FAMILY,
}

export const GANTT_PARAM_DIRECTIVE_RULES = {
  ...getParamRulesFromConfig(defaultConfig),
  axisFormat: { valueType: 'string' },
} as const

export const configKey = 'gantt'

const configurator = makeConfigurator<GanttConf>({
  defaultConfig,
  configKey,
  getConfigFromParamDirectives(configParams) {
    return interpreteConfigs(GANTT_PARAM_DIRECTIVE_RULES, configParams)
  },
  getConfigFromTheme(t, conf) {
    const canvasBgInstance = tinycolor(t.canvasBackground || 'white')
    const isBgLight = canvasBgInstance.isLight()

    let fontColorOverBackground: string
    let gridLineColor: string
    if (isBgLight) {
      fontColorOverBackground = PALETTE.normalDark
      gridLineColor = tinycolor(fontColorOverBackground).lighten(20).toHexString()
    } else {
      fontColorOverBackground = PALETTE.white
      gridLineColor = tinycolor(fontColorOverBackground).darken(20).toHexString()
    }

    const primaryCorlorInstance = tinycolor(t.primaryColor)
    const sectionBackgrounds = [primaryCorlorInstance.brighten(20).desaturate(10).toHexString(), undefined]

    tinycolor(fontColorOverBackground)
    return {
      barBackground: t.primaryColor,
      barBorderColor: conf.fontColor,
      fontColor: t.textColor,
      axisLabelColor: fontColorOverBackground,
      sectionLabelColor: fontColorOverBackground,
      sectionBackgrounds,
      gridLineColor,
    }
  },
})

export const getConf = configurator.getConfig
