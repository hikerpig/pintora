import { PintoraConfig } from '@pintora/core'
import { BaseDiagramIR } from './ir'
import { ConfigParam, OverrideAction } from './style'

export class BaseDb {
  configParams: ConfigParam[] = []
  overrideConfig: Partial<PintoraConfig> = {}

  addOverrideConfig(action: OverrideAction) {
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
