import pintora from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig } from '../../__tests__/test-util'
import { erDiagram } from '../index'

describe('component-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    pintora.diagramRegistry.registerDiagram('erDiagram', erDiagram)
  })

  it('will not throw error', () => {
    expect(testDraw(EXAMPLES.erLarge.code).graphicIR).toBeTruthy()
  })
})
