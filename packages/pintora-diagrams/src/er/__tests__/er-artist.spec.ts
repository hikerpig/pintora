import pintora from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
import { erDiagram } from '../index'

describe('er-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    pintora.diagramRegistry.registerDiagram('erDiagram', erDiagram)
  })

  it('will not throw error', () => {
    expect(testDraw(EXAMPLES.erLarge.code).graphicIR).toBeTruthy()
  })

  it('will process containerSize and @useMaxWidth', () => {
    const code = `
    erDiagram
    @param useMaxWidth true
    artists {
      INTEGER ArtistId
      NVARCHAR Name
    }
    albums
    `
    const result = testDraw(code, { containerSize: { width: 1000 } })
    expect(Math.round(result.graphicIR.width)).toBe(1000)
  })

  it('will draw inheritance', () => {
    const code = `
    erDiagram
    person {
      int age
      string phone_number
    }

    customer inherit person
    deliverer inherit person

    customer {
      string address "deliver address"
      string id PK
    }
    `
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })
})
