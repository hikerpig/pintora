import * as pintora from '@pintora/core'
import { stripStartEmptyLines } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, traverseGraphicsIR } from '../../__tests__/test-util'
import { classDiagram, type ClassIR } from '../index'

describe('class-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    pintora.diagramRegistry.registerDiagram('classDiagram', classDiagram)
  })

  it('can draw multiple relations between same classes', () => {
    // This tests the commit: adjust layout nodes to avoid line overlap when multiple lines between two entities
    const code = stripStartEmptyLines(`
    classDiagram
      class A
      class B
      A --> B : relation 1
      A ..> B : relation 2
      A --> B : relation 3
    `)
    const result = testDraw(code)
    expect(result.graphicIR.mark).toBeTruthy()

    // Count relation lines
    let lineCount = 0
    traverseGraphicsIR(result.graphicIR, mark => {
      if (mark.class === 'class__rel-line') {
        lineCount++
      }
    })
    // Each relation creates 2 edge segments (start->dummy, dummy->end)
    expect(lineCount).toBe(6)
  })

  it('can draw relations with labels on both sides', () => {
    const code = stripStartEmptyLines(`
    classDiagram
      class Customer
      class Order
      Customer "1" --> "many" Order : places
    `)
    const result = testDraw(code)
    expect(result.graphicIR.mark).toBeTruthy()

    // Check for label marks in diagramIR
    const diagramIR = result.diagramIR as ClassIR
    expect(diagramIR.relations.length).toBe(1)
    expect(diagramIR.relations[0].labelLeft).toBe('1')
    expect(diagramIR.relations[0].labelRight).toBe('many')
    expect(diagramIR.relations[0].label).toBe('places')
  })

  it('can draw various relation types', () => {
    const code = stripStartEmptyLines(`
    classDiagram
      class A
      class B
      class C
      class D
      class E
      A <|-- B : inheritance
      A *-- C : composition
      A o-- D : aggregation
      A --> E : association
    `)
    const result = testDraw(code)
    expect(result.graphicIR.mark).toBeTruthy()

    // Verify all relations are parsed correctly
    const diagramIR = result.diagramIR as ClassIR
    expect(diagramIR.relations.length).toBe(4)
  })
})
