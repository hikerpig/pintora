import { defineDiagram } from '../util/define-diagram'
import db, { UseCaseDiagramIR } from './db'
import artist from './artist'
import { parse } from './parser'
import { configKey, UseCaseConf } from './config'
import { ParserWithPreprocessor } from '../util/preproccesor'

export type { UseCaseDiagramIR, UseCaseConf }

export const useCaseDiagram = defineDiagram<UseCaseDiagramIR, UseCaseConf>({
  pattern: /^\s*useCaseDiagram/,
  db,
  draw: artist,
  configKey,
  parser: new ParserWithPreprocessor({
    db,
    parse,
  }),
})
