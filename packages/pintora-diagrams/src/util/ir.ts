import { PintoraConfig } from '@pintora/core'
import { ConfigParam } from './config'
import type { BindRule, StyleRule } from './style-engine/shared'

export type BaseDiagramIR = {
  title?: string
  configParams: ConfigParam[]
  overrideConfig: Partial<PintoraConfig>
  styleRules?: StyleRule[]
  bindRules?: BindRule[]
}
