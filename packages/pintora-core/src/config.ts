import deepmerge from 'deepmerge'
import cloneDeep from 'clone-deep'
import { ITheme, themeRegistry } from './themes'

export interface PintoraConfig {
  core: {
    /** by default it's 'svg' */
    defaultRenderer: string
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
  },
  themeConfig: {
    theme: 'default',
    darkTheme: 'dark',
    themeVariables: themeRegistry.themes.default,
    // themeVariables: themeRegistry.themes..dark,
  },
}

const overwriteArrayMerge = <T>(destinationArray: T[], sourceArray: T[]) => sourceArray

const configApi = {
  getConfig<T = PintoraConfig>() {
    return config as any as T
  },
  setConfig<T = PintoraConfig>(c: Partial<T>) {
    config = deepmerge(config, c, {
      arrayMerge: overwriteArrayMerge,
    })
  },
  cloneConfig() {
    return cloneDeep(config)
  },
  replaceConfig<T = PintoraConfig>(c: T) {
    config = c as any
  },
}

export default configApi
