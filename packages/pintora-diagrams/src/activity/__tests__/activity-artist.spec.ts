import { diagramRegistry } from '@pintora/core'
import { EXAMPLES, stripStartEmptyLines } from '@pintora/test-shared'
import { testDraw, prepareDiagramConfig, stripDrawResultForSnapshot } from '../../__tests__/test-util'
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
})
