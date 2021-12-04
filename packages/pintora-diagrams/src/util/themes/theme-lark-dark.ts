import { ITheme } from './base'
import { BLUE_LARK, NOTE_BACKGROUND } from './palette'

export class ThemeLarkDark implements ITheme {
  isDark = true
  schemeOppsiteTheme = 'larkLight'

  primaryColor = BLUE_LARK.blue
  secondaryColor = BLUE_LARK.blue
  teritaryColor = BLUE_LARK.darkBlue

  primaryLineColor = BLUE_LARK.green
  secondaryLineColor = BLUE_LARK.white

  textColor = BLUE_LARK.white
  primaryTextColor = BLUE_LARK.white
  secondaryTextColor = BLUE_LARK.white
  teritaryTextColor = BLUE_LARK.white

  primaryBorderColor = BLUE_LARK.blue
  secondaryBorderColor = BLUE_LARK.normalDark

  canvasBackground = BLUE_LARK.normalDark
  groupBackground = BLUE_LARK.normalDark
  background1 = BLUE_LARK.normalDark

  noteTextColor = BLUE_LARK.normalDark
  noteBackground = NOTE_BACKGROUND
}
