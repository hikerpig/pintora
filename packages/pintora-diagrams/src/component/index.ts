import { defineDiagram } from '../util/define-diagram'
import { ParserWithPreprocessor } from '../util/preproccesor'
import artist from './artist'
import { ComponentConf, configKey } from './config'
import db, { ComponentDiagramIR } from './db'
import { parse as baseParse } from './parser'
import { setYY } from './parser/componentDiagram'

// Set database instance for grammar
setYY(db)

// Custom parser with post-processing
const parse = (text: string) => {
  baseParse(text)
  db.fillMissingElements()
}

export type { ComponentConf, ComponentDiagramIR }

export const componentDiagram = defineDiagram<ComponentDiagramIR, ComponentConf>({
  pattern: /^\s*componentDiagram/,
  db,
  draw: artist,
  configKey,
  parser: new ParserWithPreprocessor({
    db,
    parse,
  }),
})

export default componentDiagram
