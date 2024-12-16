import { PintoraConfig } from '@pintora/core'
import { BaseDiagramIR } from './ir'
import { ConfigParam, OverrideConfigAction } from './config'
import type { IStyleDb } from './style-engine/parser'
import type { StyleRule } from './style-engine/shared'

export class BaseDb implements IStyleDb {
  configParams: ConfigParam[] = []
  overrideConfig: Partial<PintoraConfig> = {}
  title = ''
  styleRules: StyleRule[] = []

  init(ir: Partial<BaseDiagramIR>) {
    if ('title' in ir) {
      this.title = ir.title
    }
    if ('configParams' in ir) {
      this.configParams = [...ir.configParams]
    }
    if ('overrideConfig' in ir) {
      Object.assign(this.overrideConfig, ir.overrideConfig)
    }

    if ('styleRules' in ir) {
      this.styleRules = ir.styleRules
    }
  }

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
      title: this.title,
      styleRules: this.styleRules,
    }
  }

  clear() {
    this.configParams = []
    this.overrideConfig = {}
    this.title = ''
    this.styleRules = []
  }
}

export type ActionPayload<ActionPayloadMap, T extends keyof ActionPayloadMap> = { type: T } & ActionPayloadMap[T]

export type MakeAction<M> = ActionPayload<M, keyof M>

export type ActionHandler<M, D, T extends keyof M> = (this: D, action: ActionPayload<M, T>) => unknown
