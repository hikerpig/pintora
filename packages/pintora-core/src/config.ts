import deepmerge from 'deepmerge'

let config = {}

const configApi = {
  getConfig<T = any>() {
    return config as T
  },
  setConfig<T = any>(c: Partial<T>) {
    config = deepmerge(config, c)
  },
}

export default configApi
