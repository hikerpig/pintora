import { diagramRegistry } from '@pintora/core'
import { EXAMPLES } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
import { componentDiagram } from '../index'

describe('component-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    diagramRegistry.registerDiagram('componentDiagram', componentDiagram)
  })

  it('match example snapshot', () => {
    expect(stripDrawResultForSnapshot(testDraw(EXAMPLES.component.code))).toMatchSnapshot()
  })

  it('can parse and handle bindClass', () => {
    const code = `
    componentDiagram
    component comp1
    
    @bindClass node-comp1 test-class
    `
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })
})
