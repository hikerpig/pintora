import * as pintora from '@pintora/core'
import type { Group, Path, Rect } from '@pintora/core'
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
    const relationPaths = (relationsGroup?.children.filter(
      child => child.type === 'path' && child.semantic?.role === 'connector',
    ) || []) as pintora.Path[]

    expect(relationPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semantic: expect.objectContaining({
            role: 'connector',
            strokePolicy: 'always',
            connector: expect.objectContaining({
              family: 'er-relationship',
              compact: true,
              compactEndpointClearance: 'both',
              shaftStyle: 'solid',
              startTerminator: { kind: 'er-only-one' },
              endTerminator: { kind: 'none' },
            }),
          }),
        }),
        expect.objectContaining({
          semantic: expect.objectContaining({
            role: 'connector',
            strokePolicy: 'always',
            connector: expect.objectContaining({
              family: 'er-relationship',
              compact: true,
              compactEndpointClearance: 'both',
              shaftStyle: 'solid',
              startTerminator: { kind: 'none' },
              endTerminator: { kind: 'er-zero-or-more' },
            }),
          }),
        }),
      ]),
    )
  })

  it('splits relationship connector into two segments with a label gap node', () => {
    const code = `
erDiagram
  @param layoutDirection LR
  A ||--o{ B : has
    `

    const { graphicIR } = testDraw(code)
    const relationsGroup = (graphicIR.mark as Group).children.find(
      child => child.type === 'group' && child.class === 'er__relations',
    ) as Group | undefined
    const relationPaths = (relationsGroup?.children.filter(
      child => child.type === 'path' && child.semantic?.role === 'connector',
    ) || []) as Path[]

    expect(relationPaths).toHaveLength(2)
    expect(relationPaths).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          semantic: expect.objectContaining({
            connector: expect.objectContaining({
              startTerminator: { kind: 'er-only-one' },
              endTerminator: { kind: 'none' },
            }),
          }),
        }),
        expect.objectContaining({
          semantic: expect.objectContaining({
            connector: expect.objectContaining({
              startTerminator: { kind: 'none' },
              endTerminator: { kind: 'er-zero-or-more' },
            }),
          }),
        }),
      ]),
    )
  })

  it('marks inheritance triangle as semantic symbol for text renderers', () => {
    const code = `
erDiagram
  CUSTOMER inherit PERSON
    `

    const { graphicIR } = testDraw(code)
    const inheritanceGroup = (graphicIR.mark as Group).children.find(
      child => child.type === 'group' && child.children.some(grandChild => grandChild.type === 'path'),
    ) as Group | undefined
    const trianglePath = inheritanceGroup?.children.find(
      child => child.type === 'path' && child.semantic?.role === 'symbol',
    ) as Path | undefined

    expect(trianglePath?.semantic).toMatchObject({
      role: 'symbol',
      strokePolicy: 'always',
      symbol: {
        family: 'er-node',
        kind: 'er-inheritance-triangle',
        compact: true,
        direction: 'down',
      },
    })
  })

  it('keeps inheritance label and triangle on the same layout node', () => {
    const code = `
erDiagram
  CUSTOMER inherit PERSON
    `

    const { graphicIR } = testDraw(code)
    const inheritanceGroup = (graphicIR.mark as Group).children.find(
      child => child.type === 'group' && child.children.some(grandChild => grandChild.type === 'path'),
    ) as Group | undefined
    const inheritanceLines = (inheritanceGroup?.children.filter(
      child => child.type === 'path' && child.semantic?.role !== 'symbol',
    ) || []) as Path[]

    expect(inheritanceGroup?.children.some(child => child.type === 'text' && child.attrs.text === 'ISA')).toBe(true)
    expect(inheritanceLines).toHaveLength(2)
  })

  it('centers inheritance label on the triangle node', () => {
    const code = `
erDiagram
  CUSTOMER inherit PERSON
    `

    const { graphicIR } = testDraw(code)
    const inheritanceGroup = (graphicIR.mark as Group).children.find(
      child => child.type === 'group' && child.children.some(grandChild => grandChild.type === 'path'),
    ) as Group | undefined
    const labelMark = inheritanceGroup?.children.find(child => child.type === 'text' && child.attrs.text === 'ISA') as
      | pintora.Text
      | undefined
    const trianglePath = inheritanceGroup?.children.find(
      child => child.type === 'path' && child.semantic?.role === 'symbol',
    ) as Path | undefined
    const triangleCommands = trianglePath?.attrs.path as unknown[] | undefined
    const topPoint = triangleCommands?.[0] as ['M', number, number] | undefined
    const leftPoint = triangleCommands?.[1] as ['L', number, number] | undefined

    expect(labelMark).toBeTruthy()
    expect(topPoint).toBeTruthy()
    expect(leftPoint).toBeTruthy()
    expect(labelMark?.attrs.x).toBe(topPoint?.[1])
    expect(labelMark?.attrs.y).toBe((topPoint?.[2] + leftPoint?.[2]) / 2)
  })

  it('marks inheritance label with low-fidelity omit semantic', () => {
    const code = `
erDiagram
  CUSTOMER inherit PERSON
    `

    const { graphicIR } = testDraw(code)
    const inheritanceGroup = (graphicIR.mark as Group).children.find(
      child => child.type === 'group' && child.children.some(grandChild => grandChild.type === 'path'),
    ) as Group | undefined
    const labelMark = inheritanceGroup?.children.find(child => child.type === 'text' && child.attrs.text === 'ISA') as
      | pintora.Text
      | undefined

    expect(labelMark?.semantic).toMatchObject({
      text: {
        lowFidelityVisibility: 'omit',
      },
    })
  })
})
