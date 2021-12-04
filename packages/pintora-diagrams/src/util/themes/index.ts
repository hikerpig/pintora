import { ThemeDefault } from './theme-default'
import { ThemeDark } from './theme-dark'
import { ITheme } from './base'

const THEMES: Record<string, ITheme> = {
  default: new ThemeDefault(),
  dark: new ThemeDark(),
}

export default THEMES
