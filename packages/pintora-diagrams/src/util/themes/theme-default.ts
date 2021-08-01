import { ITheme } from './base'
import { AYU_LIGHT } from './palette'

export class ThemeDefault implements ITheme {
  primaryColor = AYU_LIGHT.orange
  secondaryColor = AYU_LIGHT.yellow
  teritaryColor = AYU_LIGHT.purple

  textColor = AYU_LIGHT.normalDark
  primaryTextColor = AYU_LIGHT.normalDark
  secondaryTextColor = AYU_LIGHT.normalDark
  teritaryTextColor = AYU_LIGHT.normalDark

  primaryBorderColor = AYU_LIGHT.normalDark
  secondaryBorderColor = AYU_LIGHT.neutralGray

  groupBackground = AYU_LIGHT.white
  lightBackground = AYU_LIGHT.neutralGray

  noteBackground = AYU_LIGHT.yellow
}
