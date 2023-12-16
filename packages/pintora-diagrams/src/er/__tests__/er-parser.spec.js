import { parse } from '../parser'
import db from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('er parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('will parse message inside quotes', () => {
    const example = stripStartEmptyLines(`
erDiagram
  artists {
    INTEGER ArtistId
    NVARCHAR Name
  }
  albums

  artists ||--o{ albums : "foreign key"
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.entities['artists']).toBeTruthy()
  })

  it('will parse attribute key', () => {
    const example = `erDiagram
    ORDER {
      int orderNumber PK
      string deliveryAddress
    }
    `
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.entities).toMatchObject({
      ORDER: {
        attributes: [
          {
            attributeType: 'int',
            attributeName: 'orderNumber',
            attributeKey: 'PK',
          },
          {
            attributeType: 'string',
            attributeName: 'deliveryAddress',
          },
        ],
      },
    })
  })

  it('will parse attribute comment', () => {
    const example = `erDiagram
    ORDER {
      int orderNumber UK "comment here"
      int vol "comment 2"
    }
    `
    parse(example)
    const ir = db.getDiagramIR()
    console.log(JSON.stringify(ir, null, 2))
    expect(ir.entities).toMatchObject({
      ORDER: {
        attributes: [
          {
            attributeType: 'int',
            attributeName: 'orderNumber',
            attributeKey: 'UK',
            comment: 'comment here',
          },
          {
            attributeType: 'int',
            attributeName: 'vol',
            comment: 'comment 2',
          },
        ],
      },
    })
  })

  it('will parse specialisation', () => {
    const example = stripStartEmptyLines(`
    erDiagram
      person {
        int age
      }

      teacher inherit person
      student inherit person

      teacher }|..|{ student : teach
    `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.entities).toMatchObject({
      person: {
        attributes: [
          {
            attributeType: 'int',
            attributeName: 'age',
            comment: '',
          },
        ],
      },
      teacher: {
        attributes: [],
      },
      student: {
        attributes: [],
      },
    })
    expect(ir.inheritances).toMatchObject([
      {
        sup: 'person',
        sub: 'teacher',
      },
      {
        sup: 'person',
        sub: 'student',
      },
    ])
  })
  it('can parse comments', () => {
    parse(
      stripStartEmptyLines(`
erDiagram
  %% comment here
  `),
    )
    const ir = db.getDiagramIR()
    expect(Object.keys(ir.entities).length).toBe(0)
  })

  it('can parse title', () => {
    const example = stripStartEmptyLines(`
erDiagram
  title: Hello
  %% comment here
  `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.title).toEqual('Hello')
  })
})
