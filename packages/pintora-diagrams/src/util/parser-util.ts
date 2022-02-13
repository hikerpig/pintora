import nearley from '@hikerpig/nearley'
import { compact } from '@pintora/core'
// import { dedent } from './text'

type Options<T> = {
  prepare?(): void
  postProcess?(results: T[]): T[]
}

export function genParserWithRules<T = any>(grammar: nearley.CompiledRules, opts: Options<T> = {}) {
  return function parse(text: string) {
    // should construct a brand new parser everytime
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar))

    if (opts.prepare) opts.prepare()

    // a hack to remove blank lines
    let preparedText = text
    preparedText = preparedText
      .split('\n')
      .filter(line => {
        return line.length > 0
      })
      .join('\n')

    // a hack to avoid nearley's getting duplicate results
    // preparedText = dedent(preparedText)

    // a hack to add a new line as EOF, https://github.com/kach/nearley/issues/194
    const textToParse = preparedText[preparedText.length - 1] !== '\n' ? preparedText + '\n' : preparedText

    // const start = Date.now()
    parser.feed(textToParse)
    // console.log('parse caused', Date.now() - start, 'ms')
    // console.log('[genParserWithRules]parser results', parser.results)
    let results = compact(parser.results)

    if (opts.postProcess) {
      results = opts.postProcess(results)
    }
    return results
  }
}
