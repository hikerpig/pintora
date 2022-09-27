import { ThemeDefault } from './theme-default'
import { ThemeDark } from './theme-dark'
import { ThemeLarkLight } from './theme-lark-light'
import { ThemeLarkDark } from './theme-lark-dark'
import { ITheme } from './base'

import { AYU_LIGHT, DRACULA } from './palette'

export type { ITheme }

export class ThemeRegistry {
  themes: Record<string, ITheme> = {
    default: new ThemeDefault(),
    dark: new ThemeDark(),
    larkLight: new ThemeLarkLight(),
    larkDark: new ThemeLarkDark(),
  }

  palettes = {
    AYU_LIGHT,
    DRACULA,
  }

  registerTheme(name: string, variables: ITheme) {
    if (this.themes[name]) {
      console.warn(`[pintora] override theme ${name}`)
    }
    this.themes[name] = variables
  }
}

export const themeRegistry = new ThemeRegistry()
