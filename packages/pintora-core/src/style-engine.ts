/**
 * This module evaluate custom style params to real style configs
 */
import { parseColor } from './util/color'

export type StyleValueType = 'color' | 'fontSize'

export type StyleMeta = {
  valueType: StyleValueType | StyleValueType[]
}

export type StyleParam<K = string> = {
  key: K
  value: string
}

type StyleEvaluateResult<T> = { valid: true; value: T } | { valid: false }

interface StyleValueTypeMap {
  color: string
  fontSize: number
}

const styleValueEvaluators: { [K in StyleValueType]: (p: StyleParam) => StyleEvaluateResult<StyleValueTypeMap[K]> } = {
  color({ value }) {
    const parsed = parseColor(value)
    return { value: parsed.color, valid: true }
  },
  fontSize({ value }) {
    const parsed = parseInt(value)
    if (isNaN(parsed)) return { valid: false }
    return { value: parsed, valid: true }
  },
}

type StyleRuleMap = Record<string, StyleMeta>

/**
 * Generate style config from style params
 */ 
export function interpreteStyles<T extends StyleRuleMap>(
  ruleMap: T,
  params: StyleParam[],
): { [K in keyof T]: T[K]['valueType'] } {
  const out: any = {}
  params.forEach(param => {
    const meta = ruleMap[param.key]
    if (!meta) return
    const valueTypes = Array.isArray(meta.valueType) ? meta.valueType : [meta.valueType]
    for (const valueType of valueTypes) {
      const evaluator = styleValueEvaluators[valueType]
      if (!evaluator) continue
      const result = evaluator(param)
      if (result.valid) {
        out[param.key] = result.value
        return
      }
    }
  })
  // console.log('interpreteStyles', out)
  return out
}
