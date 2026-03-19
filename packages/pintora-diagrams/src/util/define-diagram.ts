import { IDiagram, DefineDiagramConfig, IDiagramArtist, IDiagramParser } from '@pintora/core'
import { genParserWithRules } from './parser-util'
import { ParserWithPreprocessor } from './preproccesor'

/**
 * Factory function to define a new diagram with minimal boilerplate.
 * Automatically handles parser creation, preprocessing, artist setup, and state management.
 *
 * @example
 * const myDiagram = defineDiagram({
 *   pattern: /^\s*myDiagram/,
 *   grammar: myGrammar,
 *   db: myDb,
 *   draw: myDrawFunction,
 *   configKey: 'myDiagram',
 * })
 */
export function defineDiagram<D = unknown, Config = unknown>(
  config: DefineDiagramConfig<D, Config>,
): IDiagram<D, Config> {
  const { pattern, grammar, db, draw, configKey, eventRecognizer, parser: customParser, clear: customClear } = config

  // Create parser if custom parser not provided
  let parser: IDiagramParser<D>
  if (customParser) {
    parser = customParser
  } else if (grammar && db) {
    // Default parser creation with preprocessor
    const baseParser = genParserWithRules(grammar, {
      dedupeAmbigousResults: true,
      postProcess(results) {
        db.apply(results as any)
        return results
      },
    })
    parser = new ParserWithPreprocessor({
      db: db as any,
      parse: baseParser as any,
    })
  } else {
    throw new Error('Either (parser) or (grammar and db) must be provided in defineDiagram config')
  }

  // Create artist from draw function or use existing artist instance
  let artist: IDiagramArtist<D, Config>
  if (typeof draw === 'function') {
    artist = { draw }
  } else {
    artist = draw
  }

  // Default clear function - clear db if available, else no-op
  const clear = customClear || (db ? () => db.clear() : () => {})

  return {
    pattern,
    parser,
    artist,
    eventRecognizer,
    configKey,
    clear,
  }
}
