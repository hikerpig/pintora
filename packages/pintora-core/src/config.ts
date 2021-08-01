let config = {}

const configApi = {
  getConfig<T=any>() {
    return config as T
  },
  setConfig<T=any>(c: Partial<T>) {
    Object.assign(config, c)
  },
}

export default configApi
