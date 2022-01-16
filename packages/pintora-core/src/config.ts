import deepmerge from 'deepmerge'

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

const configApi = {
  getConfig<T = PintoraConfig>() {
    return config as any as T
  },
  setConfig<T = PintoraConfig>(c: Partial<T>) {
    config = deepmerge(config, c)
  },
}

export default configApi
