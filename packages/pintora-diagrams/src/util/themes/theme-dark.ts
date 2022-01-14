import { ITheme } from './base'
import { DRACULA, NOTE_BACKGROUND } from './palette'

export class ThemeDark implements ITheme {
  isDark = true
  schemeOppsiteTheme = 'default'

  // primaryColor = DRACULA.pink
  primaryColor = DRACULA.purple
  secondaryColor = DRACULA.pink
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
  noteBackground = NOTE_BACKGROUND
}
