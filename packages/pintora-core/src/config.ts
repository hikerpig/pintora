/* eslint-disable @typescript-eslint/no-explicit-any */
import deepmerge from 'deepmerge'
import cloneDeep from 'clone-deep'
import { ITheme, themeRegistry } from './themes'
import { DEFAULT_FONT_FAMILY } from './consts'
import { DeepPartial } from '.'

export interface PintoraConfig {
  core: {
    /** by default it's 'svg' */
    defaultRenderer: string
    defaultFontFamily: string
    useMaxWidth: boolean
  }
  themeConfig: {
    theme: string
    darkTheme?: string
    themeVariables: ITheme
  }
}

let config: PintoraConfig = {
  core: {
    defaultRenderer: 'svg',
    defaultFontFamily: DEFAULT_FONT_FAMILY,
    useMaxWidth: false,
  },
  themeConfig: {
    theme: 'default',
    darkTheme: 'dark',
    themeVariables: themeRegistry.themes.default,
    // themeVariables: themeRegistry.themes.dark,
  },
}

const overwriteArrayMerge = <T>(destinationArray: T[], sourceArray: T[]) => sourceArray

const configApi = {
  getConfig<T = PintoraConfig>() {
    return config as any as T
  },
  setConfig<T extends PintoraConfig = PintoraConfig>(c: DeepPartial<T>) {
    const newConfig = configApi.gnernateNewConfig(c)
    config = newConfig
  },
  cloneConfig() {
    return cloneDeep(config)
  },
  replaceConfig<T = PintoraConfig>(c: T) {
    config = c as any
  },
  /**
   * Genrate new config based on current globalConfig and input partial config
   */
  gnernateNewConfig<T extends PintoraConfig = PintoraConfig>(c: DeepPartial<T>): T {
    const newConfig = deepmerge(config, c as any, {
      arrayMerge: overwriteArrayMerge,
    })

    // special case for themeConfig
    if (c.themeConfig?.theme) {
      const themeName = c.themeConfig.theme
      const themeVars = themeRegistry.themes[themeName as any]
      const configThemeVars = c.themeConfig.themeVariables
      if (themeVars) {
        newConfig.themeConfig = newConfig.themeConfig || ({} as any)
        newConfig.themeConfig.themeVariables = { ...themeVars }
      }
      if (configThemeVars) {
        Object.assign(newConfig.themeConfig.themeVariables, configThemeVars)
      }
    }

    return newConfig as T
  },
}

export default configApi
