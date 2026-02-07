import * as pintora from '@pintora/core'
import { stripStartEmptyLines } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, traverseGraphicsIR } from '../../__tests__/test-util'
import { classDiagram, type ClassConf, type ClassIR } from '../index'
import { RowConfig, __testing } from '../artist'
import { defaultConfig } from '../config'

const { EntityLayoutEngine, EntityMarkBuilder } = __testing

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

  it('keeps section background stroke while avoiding duplicate top separator line', () => {
    const code = stripStartEmptyLines(`
    classDiagram
      class Fruit {
        <<interface>>
        float sweetness
      }
    `)
    const result = testDraw(code)
    expect(result.graphicIR.mark).toBeTruthy()

    const sectionBgMarks: any[] = []
    const separatorLineYs: number[] = []
    traverseGraphicsIR(result.graphicIR, mark => {
      if (mark.class === 'class__section-bg') {
        sectionBgMarks.push(mark)
      }
      if (mark.class === 'class-entity__sep-line') {
        separatorLineYs.push(mark.attrs?.y1)
      }
    })

    expect(sectionBgMarks.length).toBeGreaterThan(0)
    expect(separatorLineYs.length).toBeGreaterThan(0)
    sectionBgMarks.forEach(mark => {
      expect(mark.attrs?.stroke).toBeTruthy()
      expect(separatorLineYs).not.toContain(mark.attrs?.y)
    })
  })

  describe('EntityLayoutEngine', () => {
    type ClassEntityLayoutInput = {
      header: string | string[]
      annotation?: string
      fields: Array<string | RowConfig>
      methods: Array<string | RowConfig>
    }

    const buildClassEntityLayout = (input: ClassEntityLayoutInput, conf: ClassConf = defaultConfig) => {
      const builder = new EntityMarkBuilder({} as any, conf)
      const headerLabel = Array.isArray(input.header) ? input.header[0] : input.header
      builder.addHeader(headerLabel ?? '', input.annotation)
      builder.addMemberSections([input.fields, input.methods])

      const layout = EntityLayoutEngine.build(builder.sections, builder.rowPadding, builder.getFontConfig())

      return {
        size: layout.size,
        contentHeight: layout.contentHeight,
        sections: layout.sections,
        sectionSeparatorYs: layout.sectionSeparatorYs,
        bodySectionBounds: layout.bodySectionBounds,
        labels: layout.labels,
      }
    }

    it('exposes layout data for header-only classes', () => {
      const layout = buildClassEntityLayout({
        header: ['User'],
        fields: [],
        methods: [],
      })
      expect(layout.size.width).toBeGreaterThan(0)
      expect(layout.size.height).toBeGreaterThan(0)
      expect(layout.sectionSeparatorYs).toBeDefined()
      expect(layout.bodySectionBounds).toBeDefined()
    })

    it('exposes underline positions for static members', () => {
      const layout = buildClassEntityLayout({
        header: ['User'],
        fields: [{ label: '+name: string', underline: true }],
        methods: ['+getName(): string'],
      })
      const underlineYs = layout.labels.filter(l => l.underlineY !== undefined).map(l => l.underlineY)
      expect(underlineYs.length).toBeGreaterThan(0)
    })

    it('keeps annotation and class name as separate header labels', () => {
      const layout = buildClassEntityLayout({
        header: ['User'],
        annotation: 'Service',
        fields: [],
        methods: [],
      })
      const headerLabels = layout.labels.filter(l => l.isHeader)
      expect(headerLabels.map(l => l.text)).toEqual(['<<Service>>', 'User'])
      expect(headerLabels[0].bold).toBeFalsy()
      expect(headerLabels[1].bold).toBeTruthy()
    })

    it('exposes measured content height for layout debugging', () => {
      const layout = buildClassEntityLayout({
        header: ['User'],
        fields: ['+name: string', '+age: number'],
        methods: ['+getName(): string'],
      })
      expect(layout.contentHeight).toBeGreaterThan(0)
      expect(layout.size.height).toBeGreaterThan(layout.contentHeight)
    })
  })
})
