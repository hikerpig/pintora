import { diagramRegistry } from '@pintora/core'
import { EXAMPLES, stripStartEmptyLines } from '@pintora/test-shared'
import {
  testDraw,
  prepareDiagramConfig,
  stripDrawResultForSnapshot,
  traverseGraphicsIR,
} from '../../__tests__/test-util'
import { activityDiagram } from '../index'

describe('activity-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    diagramRegistry.registerDiagram('activityDiagram', activityDiagram)
  })

  it('can draw', () => {
    expect(testDraw(EXAMPLES.activity.code).graphicIR.mark).toBeTruthy()
  })

  it('draw fork', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    start
    if (multiprocessor?) then
      fork
        :Action 1;
      forkagain
        :Action 2;
      endfork
      else (monoproc)
        :Action 1;
        :Action 2;
      endif
    end
    `)
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  it('draw repeat', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    start
    repeat :prepare for each loop;
      :read data;
    repeatwhile (there is more data ?) is (alright then) not (nope)

    repeat
      :do something;
    repeatwhile (not done ?)
    end
    `)
    expect(stripDrawResultForSnapshot(testDraw(code))).toMatchSnapshot()
  })

  it('Should draw a no-action-line when there is no else block', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    :Diagram requested;
    if (diagram registered ?) then
      :get implementation;
    else (no)
    endif
    `)
    const ir = stripDrawResultForSnapshot(testDraw(code))
    let count = 0
    traverseGraphicsIR(ir, mark => {
      if (mark.class === 'activity__edge-label') {
        count++
      }
    })
    expect(count).toEqual(2)
  })
})
