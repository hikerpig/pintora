import nearley from 'nearley'
import { compact } from '@pintora/core'

type Options = {
  postProcess?<T>(results: T): T 
}

export function genParserWithRules(grammar: nearley.CompiledRules, opts: Options = {}) {
  return function parse(text: string) {
    // should construct a brand new parser everytime
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))
    // a hack to add a new line as EOF, https://github.com/kach/nearley/issues/194
    const textToParse = text[text.length - 1] !== '\n' ? text + '\n' : text
    // const start = Date.now()
    parser.feed(textToParse)
    // console.log('parse caused', Date.now() - start, 'ms')
    // console.log('parser results', parser.results)
    parser.finish()
    let results = compact(parser.results)
    if (opts.postProcess) {
      results = opts.postProcess(results)
    }
    return results
  }
}
