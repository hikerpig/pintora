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

  it('can parse multiple relationships', () => {
    const example = stripStartEmptyLines(`
    classDiagram
    classA <|-- classB
    classC *-- classD
    classE o-- classF
    classG <-- classH
    classI -- classJ
    classK <.. classL
    classM <|.. classN
    classO .. classP
    class1 --|> class2
    `)
    parse(example)
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

  it('can parse singleline note', () => {
    const backquoteExample = `classDiagram
    @note right of User: singleline note
    `
    parse(backquoteExample)
    const result = db.getDiagramIR()
    // console.log('notes', result.notes)
    expect(result.notes.length).toEqual(1)
    expect(result.notes[0]).toMatchObject({
      text: 'singleline note',
    })
  })

  it('can parse multiline note', () => {
    const multilineNoteExample = stripStartEmptyLines(`
classDiagram
  class Object {
  }
  @start_note right of Object
  aaa note -
  bbb
  @end_note
    `)
    parse(multilineNoteExample)
    const result = db.getDiagramIR()
    // console.log('notes', result.notes)
    expect(result.notes.length).toEqual(1)
    // parseMessage will trim text, so this may be somehow strange
    const messageText = result.notes[0].text
    expect(messageText).toEqual('aaa note -\nbbb')
  })
})
