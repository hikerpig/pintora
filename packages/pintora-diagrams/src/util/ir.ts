import { PintoraConfig } from '@pintora/core'
import { ConfigParam } from './config'

export type BaseDiagramIR = {
  title?: string
  configParams: ConfigParam[]
  overrideConfig: Partial<PintoraConfig>
}
