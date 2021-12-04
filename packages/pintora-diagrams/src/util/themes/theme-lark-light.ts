import { ITheme } from './base'
import { BLUE_LARK, NOTE_BACKGROUND } from './palette'

export class ThemeLarkLight implements ITheme {
  schemeOppsiteTheme = 'larkDark'

  primaryColor = BLUE_LARK.blue
  secondaryColor = BLUE_LARK.cyan
  teritaryColor = BLUE_LARK.cyan

  primaryLineColor = BLUE_LARK.green
  secondaryLineColor = BLUE_LARK.white

  textColor = BLUE_LARK.normalDark
  primaryTextColor = BLUE_LARK.normalDark
  secondaryTextColor = BLUE_LARK.normalDark
  teritaryTextColor = BLUE_LARK.normalDark

  primaryBorderColor = BLUE_LARK.blue
  secondaryBorderColor = BLUE_LARK.normalDark

  canvasBackground = BLUE_LARK.white
  groupBackground = BLUE_LARK.white
  background1 = BLUE_LARK.white

  noteTextColor = BLUE_LARK.normalDark
  noteBackground = NOTE_BACKGROUND
}
