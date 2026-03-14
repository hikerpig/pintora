import { diagramRegistry } from '@pintora/core'
import { EXAMPLES, stripStartEmptyLines } from '@pintora/test-shared'
import {
  findMarkInGraphicsIR,
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

  it('should not hang with nested if statements', () => {
    // issue 392
    const code = stripStartEmptyLines(`
    activityDiagram
    title: Process functionality
    start
    :Update context info;
    :Call state function;
    if(next state is other state?) then
    :Call exit function;
    else(no)
    if(next state is other state?) then
    :Call exit function;
    else(no)
    endif
    endif
    :Action 2;
    `)
    // Set a timeout to fail if it hangs (default is usually 5s, but we can be explicit if needed)
    // Jest timeout is usually handled by the runner, but we can try to wrap in a promise with timeout if needed.
    // For now, let's rely on Jest's timeout.
    const result = testDraw(code)
    expect(result.graphicIR.mark).toBeTruthy()
  }, 1000) // 1s timeout

  it('marks action boxes as semantic containers for text renderers', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    :Do work;
    `)

    const result = testDraw(code)
    const actionGroup = findMarkInGraphicsIR(
      result.graphicIR,
      mark =>
        mark.type === 'group' && mark.children?.some(child => child.type === 'text' && child.attrs.text === 'Do work'),
    )
    const actionBox = actionGroup?.type === 'group' ? actionGroup.children.find(child => child.type === 'rect') : null

    expect(actionBox?.semantic).toEqual({
      role: 'container',
      strokePolicy: 'always',
    })
  })

  it('marks partition frames as semantic containers for text renderers', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    partition Batch {
      :Do work;
    }
    `)

    const result = testDraw(code)
    const groupRect = findMarkInGraphicsIR(
      result.graphicIR,
      mark => mark.type === 'rect' && mark.class === 'activity__group-rect',
    )

    expect(groupRect?.semantic).toEqual({
      role: 'container',
      strokePolicy: 'always',
    })
  })

  it('marks note backgrounds as semantic backdrops for text renderers', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    :Do work;
    note right: side note
    `)

    const result = testDraw(code)
    const noteBg = findMarkInGraphicsIR(result.graphicIR, mark => mark.type === 'rect' && mark.class === 'note__bg')

    expect(noteBg?.semantic).toEqual({
      role: 'backdrop',
      occludesBelow: true,
      strokePolicy: 'always',
      frame: {
        family: 'annotation',
        kind: 'note',
        compact: true,
        borderStyle: 'note-card',
      },
    })
  })

  it('marks straight activity flow shafts with connector semantics', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    start
    :Do work;
    stop
    `)

    const result = testDraw(code)
    const connectors: any[] = []
    traverseGraphicsIR(result.graphicIR, mark => {
      if (mark.semantic?.role === 'connector' && mark.semantic.connector?.family === 'activity-flow') {
        connectors.push(mark)
      }
    })

    expect(connectors.length).toBeGreaterThan(0)
    expect(connectors[0].semantic).toMatchObject({
      role: 'connector',
      strokePolicy: 'always',
      connector: {
        family: 'activity-flow',
        compact: true,
        shaftStyle: 'solid',
        startTerminator: { kind: 'none' },
        endTerminator: { kind: 'arrow-filled' },
      },
    })
  })

  it('marks activity start, end, and decision nodes with symbol semantics', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    start
    if (ready?) then
      :Ship it;
    else (no)
      :Wait;
    endif
    stop
    `)

    const result = testDraw(code)
    const symbolKinds = new Set<string>()

    traverseGraphicsIR(result.graphicIR, mark => {
      const kind = mark.semantic?.symbol?.kind
      if (kind) symbolKinds.add(kind)
    })

    expect(symbolKinds).toEqual(new Set(['activity-start', 'activity-end', 'activity-decision']))
  })

  it('marks activity decision bodies with frame semantics', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    if (ready?) then
      :Ship it;
    else (no)
      :Wait;
    endif
    `)

    const result = testDraw(code)
    const decisionBg = findMarkInGraphicsIR(
      result.graphicIR,
      mark => mark.type === 'path' && mark.class === 'activity__decision-bg',
    )

    expect(decisionBg?.semantic).toMatchObject({
      role: 'container',
      strokePolicy: 'always',
      frame: {
        family: 'activity-node',
        kind: 'decision',
        compact: true,
        borderStyle: 'solid',
        cornerStyle: 'decision',
      },
    })
  })
})
