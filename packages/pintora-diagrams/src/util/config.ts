import { ConfigParam, ConfigMeta, interpreteConfigs, PintoraConfig, safeAssign, configApi, ITheme } from '@pintora/core'

export type { ConfigParam, ConfigMeta }
export { interpreteConfigs }

export type { ParamAction, OverrideConfigAction, SetTitleAction } from '../../shared-grammars/config'

/**
 * How edges are routed
 * - 'ortho' stands for orthogonal
 */
export type EdgeType = 'polyline' | 'ortho' | 'curved'

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

/**
 * Configurator `getConfig` will add some extra fields
 * - `themeConfig`
 */
export type EnhancedConf<T> = T & {
  themeConfig: PintoraConfig['themeConfig']
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

  function getConfig(configContext: DiagramConfigContext, extraConfig?: Partial<C>): EnhancedConf<C> {
    const globalConfig: PintoraConfig = configApi.gnernateNewConfig(configContext.overrideConfig || {})
    const conf: EnhancedConf<C> = { ...defaultConfig, themeConfig: globalConfig.themeConfig }

    safeAssign(conf, opts.getConfigFromTheme(conf.themeConfig.themeVariables, conf))

    const getConfigFromGlobalConfig = opts.getConfigFromGlobalConfig || baseGetConfigFromGlobalConfig
    safeAssign(conf, getConfigFromGlobalConfig(globalConfig, configContext, configKey))

    if (extraConfig) safeAssign(conf, extraConfig)

    safeAssign(conf, configContext.overrideConfig?.[configKey])

    if (opts.getConfigFromParamDirectives) {
      safeAssign(conf, opts.getConfigFromParamDirectives(configContext.configParams))
    }

    return conf as EnhancedConf<C>
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
