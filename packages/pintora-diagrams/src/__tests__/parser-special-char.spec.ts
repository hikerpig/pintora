import { stripStartEmptyLines, EXAMPLES } from '@pintora/test-shared'
import { replaceEofToCrlf } from './test-util'
import { DIAGRAMS } from '../index'
import { diagramRegistry, parseAndDraw } from '@pintora/core'

describe('parser edge case', () => {
  beforeAll(() => {
    for (const [name, diagramDef] of Object.entries(DIAGRAMS)) {
      diagramRegistry.registerDiagram(name, diagramDef)
    }
  })

  it('can parse code with crlf as eol', () => {
    Object.values(EXAMPLES).forEach(e => {
      const code = replaceEofToCrlf(stripStartEmptyLines(e.code))
      parseAndDraw(code, {})
    })
  })
})
