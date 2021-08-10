import { ITheme } from './base'
import { DRACULA } from './palette'

export class ThemeDark implements ITheme {
  isDark = true
  schemeOppsiteTheme = 'default'

  primaryColor = DRACULA.pink
  secondaryColor = DRACULA.purple
  teritaryColor = DRACULA.cyan

  primaryLineColor = DRACULA.white
  secondaryLineColor = DRACULA.white

  textColor = DRACULA.white
  primaryTextColor = DRACULA.normalDark
  secondaryTextColor = DRACULA.white
  teritaryTextColor = DRACULA.normalDark

  primaryBorderColor = DRACULA.white
  secondaryBorderColor = DRACULA.normalDark

  canvasBackground = DRACULA.normalDark
  groupBackground = DRACULA.normalDark
  background1 = '#555'

  noteTextColor = DRACULA.normalDark
  noteBackground = DRACULA.yellow
}
