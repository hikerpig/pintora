import { parse } from '../parser'
import { db } from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('mindmap parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse different levels', () => {
    const example = stripStartEmptyLines(`
    mindmap
    * UML Diagrams 
    ** Behavior Diagrams
    *** Sequence Diagram
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.trees[0]).toMatchObject({
      root: '1',
      nodes: {
        1: {
          label: 'UML Diagrams ', // trailing space
          depth: 1,
          id: '1',
          children: ['2'],
          parent: null,
        },
        2: {
          label: 'Behavior Diagrams',
          depth: 2,
          id: '2',
          children: ['3'],
          parent: '1',
        },
        3: {
          label: 'Sequence Diagram',
          depth: 3,
          id: '3',
          children: [],
          parent: '2',
        },
      },
    })
  })

  it('can parse multiline item', () => {
    const example = stripStartEmptyLines(`
    mindmap
    * :Multiline
    example;
    `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.trees[0]).toMatchObject({
      root: '1',
      nodes: {
        1: {
          label: 'Multiline\n    example',
          depth: 1,
          id: '1',
          children: [],
          parent: null,
        },
      },
    })
  })

  it('can parse arithmetic notations', () => {
    const example = stripStartEmptyLines(`
    mindmap
    + Behavior Diagrams
    ++ Sequence Diagram
    -- State Diagram
    `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.trees[0].nodes).toMatchObject({
      1: {
        label: 'Behavior Diagrams',
        depth: 1,
        id: '1',
        children: ['2', '3'],
        parent: null,
      },
      2: {
        label: 'Sequence Diagram',
        depth: 2,
        id: '2',
        parent: '1',
      },
      3: {
        label: 'State Diagram',
        depth: 2,
        id: '3',
        isReverse: true,
        parent: '1',
      },
    })
  })

  it('will add to root if there are no parent in prev depth', () => {
    const example = stripStartEmptyLines(`
    mindmap
    ++ Behavior Diagrams
    ++ Sequence Diagram
    `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.trees[0].nodes).toMatchObject({
      1: {
        label: 'Behavior Diagrams',
        depth: 2,
        isReverse: false,
        id: '1',
        children: ['2'],
        parent: null,
      },
      2: {
        label: 'Sequence Diagram',
        depth: 2,
        isReverse: false,
        id: '2',
        children: [],
        parent: '1',
      },
    })
  })

  it('can parse multiroot mindmap', () => {
    const example = stripStartEmptyLines(`
      mindmap
      + UML Diagram
      ++ Sequence Diagram
      -- State Diagram
      + Non-UML Diagram
      ++ Entity Relationship Diagram
      `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.trees).toHaveLength(2)
  })
})
