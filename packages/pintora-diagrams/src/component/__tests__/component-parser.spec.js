import { parse } from '../parser'
import db from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('componentDiagram parser', () => {
  afterEach(() => {
    db.clear()
  })
  it('parse component', () => {
    const componentExample = stripStartEmptyLines(`
componentDiagram
component comp1
[comp2]
[component 3] as comp3
component comp4 [
  This component has
  long description
]
component "component 5" as comp5
    `)
    parse(componentExample)
    const ir = db.getDiagramIR()
    // console.log(ir)
    expect(ir.components).toMatchObject({
      comp1: { type: 'component', name: 'comp1' },
      comp2: { type: 'component', name: 'comp2' },
      comp3: { type: 'component', name: 'comp3', label: 'component 3' },
      comp4: { type: 'component', name: 'comp4', label: 'This component has\n  long description' },
      comp5: { type: 'component', name: 'comp5', label: 'component 5' },
    })
  })

  it('parse group', () => {
    const groupExample = stripStartEmptyLines(`
componentDiagram
  package "@pintora/renderer" {
    () renderer
    [SVGRender]
    [CanvasRender]
    [SVGRender] -->  renderer : implements
  }
  package "GroupExample" {
    [First Component]
  }
  rectangle "GroupEmpty" {
  }
  database "D" {
    [D Component]
  }
    `)
    parse(groupExample)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.components).toMatchObject({
      SVGRender: {
        type: 'component',
        name: 'SVGRender',
        parent: '@pintora/renderer',
      },
      CanvasRender: {
        type: 'component',
        name: 'CanvasRender',
        parent: '@pintora/renderer',
      },
      'First Component': {
        type: 'component',
        name: 'First Component',
        parent: 'GroupExample',
      },
      'D Component': {
        type: 'component',
        name: 'D Component',
        parent: 'D',
      },
    })
    expect(ir.interfaces).toEqual({
      renderer: { type: 'interface', name: 'renderer', parent: '@pintora/renderer', itemId: 'node-renderer' },
    })
    expect(ir.groups).toMatchObject({
      GroupExample: {
        groupType: 'package',
        name: 'GroupExample',
      },
      '@pintora/renderer': {
        type: 'group',
        name: '@pintora/renderer',
        groupType: 'package',
        label: '@pintora/renderer',
        children: [
          {
            type: 'interface',
            name: 'renderer',
            parent: '@pintora/renderer',
          },
          {
            type: 'component',
            name: 'SVGRender',
            parent: '@pintora/renderer',
          },
          {
            type: 'component',
            name: 'CanvasRender',
            parent: '@pintora/renderer',
          },
          {
            from: {
              type: 'component',
              name: 'SVGRender',
            },
            to: {
              type: 'interface',
              name: 'renderer',
            },
            line: {
              lineType: 'SOLID_ARROW',
            },
            message: 'implements',
            parent: '@pintora/renderer',
          },
        ],
      },
      GroupEmpty: {
        type: 'group',
        name: 'GroupEmpty',
        groupType: 'rectangle',
        children: [],
      },
    })
  })

  it('parse interface', () => {
    const interfaceExample = stripStartEmptyLines(`
componentDiagram
  interface "interf 1"
  () "interf 2"
  () "interf 3" as interf3
    `)
    parse(interfaceExample)
    const ir = db.getDiagramIR()
    expect(ir.interfaces).toMatchObject({
      'interf 1': { type: 'interface', name: 'interf 1' },
      'interf 2': { type: 'interface', name: 'interf 2' },
      interf3: { type: 'interface', name: 'interf3', label: 'interf 3' },
    })
  })

  it('parse relationship', () => {
    const relationExample = stripStartEmptyLines(`
componentDiagram
  [@pintora/cli] --> [@pintora/standalone] : use
  renderer <.. [@pintora/standalone] : use this to draw GraphicsIR
    `)
    parse(relationExample)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.relationships).toMatchObject([
      {
        from: {
          type: 'component',
          name: '@pintora/cli',
        },
        to: {
          type: 'component',
          name: '@pintora/standalone',
        },
        line: {
          lineType: 'SOLID_ARROW',
        },
        message: 'use',
      },
      {
        from: {
          type: 'interface',
          name: 'renderer',
        },
        to: {
          type: 'component',
          name: '@pintora/standalone',
        },
        line: {
          lineType: 'DOTTED_ARROW',
          isReversed: true,
        },
        message: 'use this to draw GraphicsIR',
      },
    ])
  })

  it('parse nested component', () => {
    const componentExample = stripStartEmptyLines(`
    componentDiagram
      component "A" {
        component "A.1" {
          [Diagrams]
        }
      }
    `)
    parse(componentExample)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir).toMatchObject({
      components: {
        Diagrams: {
          type: 'component',
          name: 'Diagrams',
          parent: 'A.1',
        },
      },
      groups: {
        'A.1': {
          type: 'group',
          name: 'A.1',
          groupType: 'component',
          label: 'A.1',
          children: [
            {
              type: 'component',
              name: 'Diagrams',
              parent: 'A.1',
            },
          ],
          parent: 'A',
        },
        A: {
          type: 'group',
          name: 'A',
          groupType: 'component',
          label: 'A',
          children: [
            {
              type: 'group',
              name: 'A.1',
              groupType: 'component',
              label: 'A.1',
              children: [
                {
                  type: 'component',
                  name: 'Diagrams',
                  parent: 'A.1',
                },
              ],
              parent: 'A',
            },
          ],
        },
      },
    })
  })

  it('can parse param clause', () => {
    const example = stripStartEmptyLines(`
componentDiagram
  @param lineWidth 3
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.configParams).toMatchObject([
      {
        key: 'lineWidth',
        value: '3',
      },
    ])
  })

  it('can parse element to group relationship', () => {
    parse(
      stripStartEmptyLines(`
  componentDiagram
    package "P_A" {
      [ContentA]
    }
    package "P_B" {
      [ContentB]
    }
    ContentA --> P_B : imports
    `),
    )
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(Object.keys(ir.interfaces).length).toBe(0)
    expect(ir.relationships).toMatchObject([
      {
        from: {
          type: 'interface',
          name: 'ContentA',
        },
        to: {
          type: 'interface',
          name: 'P_B',
        },
        line: {
          lineType: 'SOLID_ARROW',
        },
        message: 'imports',
      },
    ])
  })

  it('can parse comments', () => {
    parse(
      stripStartEmptyLines(`
componentDiagram
  %% comment here
  `),
    )
    const ir = db.getDiagramIR()
    expect(ir.interfaces).toEqual({})
  })

  it('can parse title', () => {
    const example = stripStartEmptyLines(`
componentDiagram
  title: Hello
  %% comment here
  `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.title).toEqual('Hello')
  })

  it('can parse escape chars', () => {
    const example = stripStartEmptyLines(`
componentDiagram
  component "we can escape \\"this\\"" as comp
  `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.components['comp'].label).toEqual(`we can escape "this"`)
  })
})
