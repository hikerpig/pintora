import type { IDiagramParser, ParseContext } from '@pintora/core'
import { BaseDb, type ActionHandler, type MakeAction } from '../base-db'
import { ConfigParam, type OverrideConfigAction } from '../config'
import type { BaseDiagramIR } from '../ir'
import { genParserWithRules } from '../parser-util'
import grammar from './parser/preproccesor'

const parseFn = genParserWithRules(grammar, {
  dedupeAmbigousResults: true,
})

type PreproccessorPayloads = {
  overrideConfig: OverrideConfigAction
  addParam: ConfigParam
  setTitle: { text: string }
}

export type Action = MakeAction<PreproccessorPayloads>

export class Preproccessor extends BaseDb {
  private ACTION_HANDLERS: {
    [K in keyof PreproccessorPayloads]: ActionHandler<PreproccessorPayloads, Preproccessor, K>
  } = {
    addParam(action) {
      this.configParams.push(action)
    },
    setTitle(action) {
      this.title = action.text
    },
    overrideConfig(action) {
      this.addOverrideConfig(action)
    },
  }

  public parse(text: string) {
    const actions = parseFn(text)
    this.apply(actions)
  }

  protected apply(action: Action | Action[]) {
    if (!action) return
    if (Array.isArray(action)) {
      action.forEach(a => this.apply(a))
      return
    }
    if (action.type in this.ACTION_HANDLERS) {
      this.ACTION_HANDLERS[action.type].call(this, action as any)
    }
  }
}

interface IPreprocessorDb<IR> {
  init(ir: BaseDiagramIR)
  getDiagramIR(): IR
}

export class ParserWithPreprocessor<IR> implements IDiagramParser<IR> {
  constructor(
    public opts: {
      db: IPreprocessorDb<IR>
      parse: (text: string, context?: ParseContext) => unknown
    },
  ) {}
  parse(text: string, context: ParseContext) {
    if (context.preContent) {
      const preprocessor = new Preproccessor()
      preprocessor.parse(context.preContent)
      const preDiagramIR = preprocessor.getBaseDiagramIR()
      this.opts.db.init(preDiagramIR)
    }
    this.opts.parse(text, context)
    return this.opts.db.getDiagramIR()
  }
}
