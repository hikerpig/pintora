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

export type ActionPayload<ActionPayloadMap, T extends keyof ActionPayloadMap> = { type: T } & ActionPayloadMap[T]

export type MakeAction<M> = ActionPayload<M, keyof M>

export type ActionHandler<M, D, T extends keyof M> = (this: D, action: ActionPayload<M, T>) => unknown
