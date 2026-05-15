import { IDiagram } from '@pintora/core'
import { ParserWithPreprocessor } from '../util/preproccesor'
import artist from './artist'
import { C4Conf, configKey } from './config'
import db from './db'
import { C4DiagramIR } from './type'
import { parse } from './parser'

export type { C4Conf, C4DiagramIR }

export const c4Diagram: IDiagram<C4DiagramIR, C4Conf> = {
  pattern: /^\s*(c4Diagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)/,
  parser: new ParserWithPreprocessor<C4DiagramIR>({
    db,
    parse,
  }),
  artist,
  configKey,
  clear() {
    db.clear()
  },
}

export default c4Diagram
