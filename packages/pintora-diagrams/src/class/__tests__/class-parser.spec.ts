import { parse } from '../parser'
import db from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('class parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse class name', () => {
    const example = stripStartEmptyLines(`
    classDiagram
      class C1
      class N1.N2.C2
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.classes['C1']).toMatchObject({ name: 'C1' })
    expect(ir.classes['N1.N2.C2']).toMatchObject({ name: 'C2', fullName: 'N1.N2.C2', namespace: 'N1.N2' })
  })

  it('can parse methods and fields', () => {
    const example = stripStartEmptyLines(`
    classDiagram
    class C1 {
      string field1
      int method1()

      field2: number
    }

    C1: method2()
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir).toMatchSnapshot()
    // console.log(JSON.stringify(ir, null, 2))
  })

  it('can parse member with modifier', () => {
    const example = stripStartEmptyLines(`
    classDiagram
    class C1 {
      { static } int method1()
      {abstract} string field1
    }
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.classes['C1'].members[0].modifier).toEqual('static')
    expect(ir.classes['C1'].members[1].modifier).toEqual('abstract')
  })

  it('can parse relationship between classes', () => {
    const example = stripStartEmptyLines(`
    classDiagram
    A1 <|-- A2
    B1 *-- B2
    C1 o-- C2
    D1 --> D2 : association
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.relations).toMatchSnapshot()
  })

  it('can parse quoted labels on relations', () => {
    const example = stripStartEmptyLines(`
    classDiagram
    C1 "1" *-- "many" C2 : contains
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.relations[0]).toMatchObject({
      type: 'addRelation',
      left: 'C1',
      right: 'C2',
      relation: 'COMPOSITION',
      labelLeft: '1',
      labelRight: 'many',
      label: 'contains',
      dashed: false,
    })
  })

  it('can parse class annotation', () => {
    const example = stripStartEmptyLines(`
    classDiagram
    << Interface >> C1
    class C2 {
      << Serializable >>
      string test
    }
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.classes).toMatchObject({
      C1: {
        annotation: 'Interface',
      },
      C2: {
        annotation: 'Serializable',
      },
    })
  })

  it('can parse class label', () => {
    const example = stripStartEmptyLines(`
    classDiagram
    class "This is class label" as class1
    class class1 {
      RED
    }
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.classes).toMatchSnapshot()
  })
})
