import { ThemeDefault } from './theme-default'
import { ThemeDark } from './theme-dark'
import { ThemeLarkLight } from './theme-lark-light'
import { ThemeLarkDark } from './theme-lark-dark'
import { ITheme } from './base'

const THEMES: Record<string, ITheme> = {
  default: new ThemeDefault(),
  dark: new ThemeDark(),
  larkLight: new ThemeLarkLight(),
  larkDark: new ThemeLarkDark(),
}

export default THEMES
