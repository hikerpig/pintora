import { ITheme } from './base'
import { AYU_LIGHT, NOTE_BACKGROUND } from './palette'

export class ThemeDefault implements ITheme {
  schemeOppsiteTheme = 'dark'

  primaryColor = AYU_LIGHT.orange
  secondaryColor = AYU_LIGHT.yellow
  teritaryColor = AYU_LIGHT.purple

  primaryLineColor = AYU_LIGHT.normalDark
  secondaryLineColor = AYU_LIGHT.normalDark

  textColor = AYU_LIGHT.normalDark
  primaryTextColor = AYU_LIGHT.normalDark
  secondaryTextColor = AYU_LIGHT.normalDark
  teritaryTextColor = AYU_LIGHT.normalDark

  primaryBorderColor = AYU_LIGHT.normalDark
  secondaryBorderColor = AYU_LIGHT.neutralGray

  groupBackground = AYU_LIGHT.white
  background1 = AYU_LIGHT.neutralGray

  noteBackground = NOTE_BACKGROUND
}
