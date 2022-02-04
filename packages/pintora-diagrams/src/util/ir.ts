import { PintoraConfig } from '@pintora/core'
import { ConfigParam } from './style'

export type BaseDiagramIR = {
  configParams: ConfigParam[]
  overrideConfig: Partial<PintoraConfig>
}
