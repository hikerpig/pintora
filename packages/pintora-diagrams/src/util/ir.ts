import { PintoraConfig } from '@pintora/core'
import { ConfigParam } from './config'

export type BaseDiagramIR = {
  configParams: ConfigParam[]
  overrideConfig: Partial<PintoraConfig>
}
