import { ITheme } from './base'
import { DRACULA } from './palette'

export class ThemeDark implements ITheme {
  primaryColor = DRACULA.pink
  secondaryColor = DRACULA.purple
  teritaryColor = DRACULA.cyan

  textColor = DRACULA.normalDark
  primaryTextColor = DRACULA.normalDark
  secondaryTextColor = DRACULA.normalDark
  teritaryTextColor = DRACULA.normalDark

  primaryBorderColor = DRACULA.normalDark
  secondaryBorderColor = DRACULA.neutralGray

  groupBackground = '#fff'
  lightBackground = DRACULA.neutralGray
  noteBackground = DRACULA.yellow
}
