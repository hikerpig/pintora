import deepmerge from 'deepmerge'
import cloneDeep from 'clone-deep'

export interface PintoraConfig {
  core: {
    /** by default it's 'svg' */
    defaultRenderer: string
  }
}

let config: PintoraConfig = {
  core: {
    defaultRenderer: 'svg',
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
