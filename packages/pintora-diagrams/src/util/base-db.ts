import { PintoraConfig } from '@pintora/core'
import { BaseDiagramIR } from './ir'
import { ConfigParam, OverrideConfigAction } from './config'

export class BaseDb {
  configParams: ConfigParam[] = []
  overrideConfig: Partial<PintoraConfig> = {}

  addOverrideConfig(action: OverrideConfigAction) {
    if ('error' in action) {
      console.error(action.error)
    } else {
      this.overrideConfig = action.value
    }
  }

  getBaseDiagramIR(): BaseDiagramIR {
    return {
      configParams: this.configParams,
      overrideConfig: this.overrideConfig,
    }
  }

  clear() {
    this.configParams = []
    this.overrideConfig = {}
  }
}
