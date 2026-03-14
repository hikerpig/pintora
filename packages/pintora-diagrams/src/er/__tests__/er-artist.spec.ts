import * as pintora from '@pintora/core'
import type { Group, Rect } from '@pintora/core'
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

  it('can parse and handle bindClass', () => {
    const code = `
    erDiagram
    e1 {
      int age
    }
    e2 {
      string name
    }

    @bindClass entity-e1 test-class
    `
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  it('marks entity box as semantic container for text renderers', () => {
    const code = `
erDiagram
  PERSON {
    string phone "phone number"
  }
    `

    const { graphicIR } = testDraw(code)
    const entityGroup = (graphicIR.mark as Group).children.find(
      child => child.type === 'group' && child.class === 'er__entity',
    ) as Group | undefined
    const entityBox = entityGroup?.children.find(child => child.type === 'rect' && child.class === 'er__entity-box') as
      | Rect
      | undefined

    expect(entityBox?.semantic).toEqual({
      role: 'container',
      strokePolicy: 'always',
    })
  })

  it('marks attribute cells as semantic containers for text renderers', () => {
    const code = `
erDiagram
  ORDER {
    int order_number PK
    string adress "delivery address"
  }
    `

    const { graphicIR } = testDraw(code)
    const entityGroup = (graphicIR.mark as Group).children.find(
      child => child.type === 'group' && child.class === 'er__entity',
    ) as Group | undefined
    const attributeGroup = entityGroup?.children.find(child => child.type === 'group') as Group | undefined
    const firstRowGroup = attributeGroup?.children.find(
      child => child.type === 'group' && child.children.some(grandChild => grandChild.type === 'rect'),
    ) as Group | undefined
    const attributeCell = firstRowGroup?.children.find(
      child => child.type === 'rect' && child.class === 'er__attribute-cell',
    ) as Rect | undefined

    expect(attributeCell?.semantic).toEqual({
      role: 'container',
      strokePolicy: 'always',
    })
  })

  it('marks relationship shaft with semantic connector metadata for cardinality rendering', () => {
    const code = `
erDiagram
  A ||--o{ B : has
    `

    const { graphicIR } = testDraw(code)
    const relationsGroup = (graphicIR.mark as Group).children.find(
      child => child.type === 'group' && child.class === 'er__relations',
    ) as Group | undefined
    const relationPath = relationsGroup?.children.find(child => child.type === 'path') as pintora.Path | undefined

    expect(relationPath?.semantic).toMatchObject({
      role: 'connector',
      strokePolicy: 'always',
      connector: {
        family: 'er-relationship',
        compact: true,
        shaftStyle: 'solid',
        startTerminator: { kind: 'er-only-one' },
        endTerminator: { kind: 'er-zero-or-more' },
      },
    })
  })
})
