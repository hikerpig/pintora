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
    `)
    parse(componentExample)
    const ir = db.getDiagramIR()
    // console.log(ir)
    expect(ir.components).toMatchObject({
      comp1: { type: 'component', name: 'comp1' },
      comp2: { type: 'component', name: 'comp2' },
      comp3: { type: 'component', name: 'comp3', label: 'component 3' },
      comp4: { type: 'component', name: 'comp4', label: 'This component has\n  long description' },
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
      renderer: { type: 'interface', name: 'renderer', parent: '@pintora/renderer' },
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
  [@pintora/standalone] --> renderer : use this to draw GraphicsIR
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
          type: 'component',
          name: '@pintora/standalone',
        },
        to: {
          type: 'interface',
          name: 'renderer',
        },
        line: {
          lineType: 'SOLID_ARROW',
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
        }
      }
    `)
    parse(componentExample)
    // const ir = db.getDiagramIR()
    // console.log('ir', ir)
  })

  it('can parse style clause', () => {
    const example = stripStartEmptyLines(`
componentDiagram
  @style lineWidth 3
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.styleParams).toMatchObject([
      {
        key: 'lineWidth',
        value: '3',
      },
    ])
  })
})
