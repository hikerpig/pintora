import { ConfigParam, ConfigMeta, interpreteConfigs, PintoraConfig, safeAssign, configApi, ITheme } from '@pintora/core'

export { ConfigParam, ConfigMeta, interpreteConfigs }

/**
 * How edges are routed
 * - 'ortho' stands for orthogonal
 */
export type EdgeType = 'polyline' | 'ortho' | 'curved'

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

export function baseGetConfigFromGlobalConfig(
  globalConfig: PintoraConfig,
  configContext: DiagramConfigContext,
  configKey: string,
) {
  const coreConfig = safeAssign<PintoraConfig['core']>({}, globalConfig.core, configContext.overrideConfig?.core)
  return safeAssign(
    { fontFamily: coreConfig.defaultFontFamily, useMaxWidth: coreConfig.useMaxWidth },
    globalConfig[configKey] || {},
  )
}

export function makeConfigurator<C>(opts: {
  defaultConfig: C
  configKey: string
  getConfigFromParamDirectives?(params: ConfigParam[]): Partial<C>
  getConfigFromGlobalConfig?(
    globalConfig: PintoraConfig,
    configContext: DiagramConfigContext,
    configKey: string,
  ): Partial<C>
  getConfigFromTheme(t: ITheme, conf: C): Partial<C>
}) {
  const { configKey, defaultConfig } = opts

  function getConfig(configContext: DiagramConfigContext, extraConfig?: Partial<C>): C {
    const globalConfig: PintoraConfig = configApi.gnernateNewConfig(configContext.overrideConfig || {})
    const t = globalConfig.themeConfig?.themeVariables
    const conf = { ...defaultConfig }

    safeAssign(conf, opts.getConfigFromTheme(t, conf))

    const getConfigFromGlobalConfig = opts.getConfigFromGlobalConfig || baseGetConfigFromGlobalConfig
    safeAssign(conf, getConfigFromGlobalConfig(globalConfig, configContext, configKey))

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

/**
 * Guess config rules based on default config field and value type
 */
export function getParamRulesFromConfig<C>(config: C) {
  const out: { [key: string]: ConfigMeta } = {}
  for (const [key, value] of Object.entries(config)) {
    const t = typeof value
    let valueType: ConfigMeta['valueType']
    if (t === 'number') {
      valueType = 'size'
    } else if (t === 'boolean') {
      valueType = 'boolean'
    } else if (t === 'string') {
      if (/color|background/.test(key.toLowerCase())) {
        valueType = 'color'
      } else {
        valueType = 'string'
      }
    }

    if (valueType) {
      out[key] = { valueType }
    }
  }
  return out
}
