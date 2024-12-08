/**
 * This module evaluate custom config params to real configs
 */
import { parseColor } from './util/color'

export type ConfigValueType =
  | 'color'
  | 'size'
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'string'
  | 'boolean'
  | 'layoutDirection'

export type ConfigMeta = {
  valueType: ConfigValueType
}

export type ConfigParam<K = string> = {
  key: K
  value: string
}

type ConfigEvaluateResult<T> = { valid: true; value: T } | { valid: false }

export type TLayoutDirection = 'LR' | 'TB'

interface ConfigValueTypeMap {
  color: string
  size: number
  fontSize: number
  fontWeight: 'normal' | 'bold' | 'bolder' | 'lighter' | number
  fontStyle: 'normal' | 'italic' | 'oblique'
  string: string
  boolean: boolean
  layoutDirection: TLayoutDirection
}

const sizeEvaluator = ({ value }: any): ConfigEvaluateResult<number> => {
  const parsed = parseInt(value)
  if (isNaN(parsed)) return { valid: false }
  return { value: parsed, valid: true }
}

const configValueEvaluators: {
  [K in ConfigValueType]: (p: ConfigParam) => ConfigEvaluateResult<ConfigValueTypeMap[K]>
} = {
  color({ value }) {
    const parsed = parseColor(value)
    return { value: parsed.color, valid: true }
  },
  size: sizeEvaluator,
  fontSize: sizeEvaluator,
  fontWeight({ value }) {
    const num = parseInt(value)
    if (isNaN(num)) {
      return { valid: true, value: value as any }
    } else {
      return { valid: true, value: num }
    }
  },
  fontStyle({ value }) {
    return { value, valid: true } as any
  },
  string({ value }) {
    return { value, valid: true }
  },
  boolean({ value }) {
    return { value: value === 'true', valid: true }
  },
  layoutDirection({ value }) {
    return { value: value as any, valid: true }
  },
}

type ConfigRuleMap = Record<string, ConfigMeta>

/**
 * Generate config from config params
 */
export function interpreteConfigs<T extends ConfigRuleMap>(
  ruleMap: T,
  params: ConfigParam[],
): { [K in keyof T]: T[K]['valueType'] extends ConfigValueType[] ? any : ConfigValueTypeMap[T[K]['valueType']] } {
  const out: any = {}
  params.forEach(param => {
    const meta = ruleMap[param.key]
    if (!meta) return
    const valueTypes: ConfigValueType[] = Array.isArray(meta.valueType) ? meta.valueType : [meta.valueType]
    for (const valueType of valueTypes) {
      const evaluator = configValueEvaluators[valueType]
      if (!evaluator) continue
      const result = evaluator(param)
      if (result.valid) {
        out[param.key] = result.value
        return
      }
    }
  })
  // console.log('interpreteConfigs', out)
  return out
}
