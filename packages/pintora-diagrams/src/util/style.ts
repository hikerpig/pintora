import { ConfigParam, interpreteConfigs, PintoraConfig, safeAssign, configApi, ITheme } from '@pintora/core'

export { ConfigParam, interpreteConfigs }

/** parser action */
export type ParamAction = {
  type: 'addParam'
  key: string
  value: string
}

export type OverrideAction<T = unknown> =
  | {
      type: 'overrideConfig'
      value: T
    }
  | {
      type: 'overrideConfig'
      error: Error
    }

export type DiagramConfigContext = {
  configParams: ConfigParam[]
  overrideConfig: Partial<PintoraConfig>
}

export function makeConfigurator<C>(opts: {
  defaultConfig: C
  configKey: string
  getConfigFromParamDirectives?(params: ConfigParam[]): Partial<C>
  getConfigFromGlobalConfig?(config: PintoraConfig): Partial<C>
  getConfigFromTheme(t: ITheme, conf: C): Partial<C>
}) {
  const { configKey, defaultConfig } = opts

  function getConfig(configContext: DiagramConfigContext, extraConfig?: Partial<C>): C {
    const globalConfig: PintoraConfig = configApi.getConfig()
    const t = globalConfig.themeConfig?.themeVariables
    const conf = { ...defaultConfig }

    safeAssign(conf, opts.getConfigFromTheme(t, conf))

    const getConfigFromGlobalConfig =
      opts.getConfigFromGlobalConfig ||
      (_globalConfig => {
        const coreConfig = safeAssign({}, _globalConfig.core, configContext.overrideConfig?.core)
        return safeAssign({ fontFamily: coreConfig.defaultFontFamily }, _globalConfig[configKey] || {})
      })
    safeAssign(conf, getConfigFromGlobalConfig(globalConfig))

    if (extraConfig) safeAssign(conf, extraConfig)

    safeAssign(conf, configContext.overrideConfig?.[configKey])
    if (opts.getConfigFromParamDirectives) {
      safeAssign(conf, opts.getConfigFromParamDirectives(configContext.configParams))
    }
    return conf
  }

  return {
    getConfig,
  }
}
