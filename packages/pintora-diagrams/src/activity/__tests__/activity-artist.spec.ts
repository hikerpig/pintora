import { diagramRegistry } from '@pintora/core'
import type { TextDiagramLineOp, TextDiagramOp, TextDiagramPlan, TextDiagramTextOp } from '@pintora/core'
import { renderTextDiagramPlan } from '@pintora/renderer/renderers/ascii/text-plan-renderer'
import { EXAMPLES, stripStartEmptyLines } from '@pintora/test-shared'
import {
  testDraw,
  prepareDiagramConfig,
  stripDrawResultForSnapshot,
  traverseGraphicsIR,
} from '../../__tests__/test-util'
import { activityDiagram } from '../index'

function widthOf(text: string) {
  return Array.from(text).reduce((sum, ch) => sum + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)
}

function alignedTextX(op: TextDiagramTextOp) {
  if (op.align === 'center') return op.x - Math.floor(widthOf(op.text) / 2)
  if (op.align === 'right') return op.x - widthOf(op.text) + 1
  return op.x
}

function lineCells(op: TextDiagramLineOp) {
  const cells: string[] = []
  if (op.from.y === op.to.y) {
    const left = Math.min(op.from.x, op.to.x)
    const right = Math.max(op.from.x, op.to.x)
    for (let x = left; x <= right; x++) cells.push(`${x},${op.from.y}`)
  } else if (op.from.x === op.to.x) {
    const top = Math.min(op.from.y, op.to.y)
    const bottom = Math.max(op.from.y, op.to.y)
    for (let y = top; y <= bottom; y++) cells.push(`${op.from.x},${y}`)
  }
  return cells
}

function countTextLineConflicts(plan: TextDiagramPlan) {
  const lineCellSet = new Set<string>()
  plan.ops.forEach((op: TextDiagramOp) => {
    if (op.type === 'line') lineCells(op).forEach(cell => lineCellSet.add(cell))
  })

  let count = 0
  plan.ops.forEach((op: TextDiagramOp) => {
    if (op.type !== 'text') return
    let cursorX = alignedTextX(op)
    Array.from(op.text).forEach(ch => {
      const w = widthOf(ch)
      for (let offset = 0; offset < w; offset++) {
        if (lineCellSet.has(`${cursorX + offset},${op.y}`)) count += 1
      }
      cursorX += w
    })
  })
  return count
}

function hasHorizontalLineBelowAllRects(plan: TextDiagramPlan) {
  const maxRectBottom = Math.max(
    ...plan.ops
      .filter((op): op is Extract<TextDiagramOp, { type: 'rect' }> => op.type === 'rect')
      .map(op => op.y + op.height - 1),
  )
  return plan.ops.some(op => op.type === 'line' && op.from.y === op.to.y && op.from.y > maxRectBottom)
}

function hasLineCell(plan: TextDiagramPlan, x: number, y: number) {
  return plan.ops.some(op => op.type === 'line' && lineCells(op).includes(`${x},${y}`))
}

function hasVerticalLineCell(plan: TextDiagramPlan, x: number, y: number) {
  return plan.ops.some(op => op.type === 'line' && op.from.x === op.to.x && lineCells(op).includes(`${x},${y}`))
}

describe('activity-artist', () => {
  beforeAll(() => {
    prepareDiagramConfig()
    diagramRegistry.registerDiagram('activityDiagram', activityDiagram)
  })

  it('can draw', () => {
    expect(testDraw(EXAMPLES.activity.code).graphicIR.mark).toBeTruthy()
  })

  it('attaches an activity ASCII text plan with action labels and connector ops', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    title: ASCII Activity
    start
    :Diagram requested;
    -> queued;
    note right: route note
    if (diagram registered ?) then
      :get implementation;
    else (no)
      :show missing diagram;
    endif
    end
    `)

    const result = testDraw(code)
    const plan = result.graphicIR.rendererData?.ascii?.plan

    expect(plan).toBeTruthy()
    expect(plan!.ops).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'text', text: 'Diagram requested' })]),
    )
    expect(plan!.ops).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'line', endHead: 'filled' })]))

    const text = renderTextDiagramPlan(plan!)
    expect(text).toContain('ASCII Activity')
    expect(text).toContain('Diagram requested')
    expect(text).toContain('queued')
    expect(text).toContain('route note')
    expect(text).toContain('diagram registered ?')
    expect(text).toContain('get implementation')
    expect(text).toContain('show missing diagram')
    expect(text).toMatch(/[│─]/)
    expect(text).toMatch(/[▼▶]/)
  })

  it('keeps switch labels and while loopbacks from colliding with ASCII connector lines', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    switch ( renderer type )
    case ( svg )
      :Generate svg;
    case ( canvas )
      :Draw canvas;
    case ( custom )
      :Custom renderer output;
    endswitch
    while (data available?) is (available)
      :read data;
    endwhile (no)
    end
    `)

    const result = testDraw(code)
    const plan = result.graphicIR.rendererData?.ascii?.plan
    expect(plan).toBeTruthy()

    const text = renderTextDiagramPlan(plan!)
    expect(text).toContain('renderer type')
    expect(text).toContain('data available?')
    expect(text).not.toContain('data ava◀')
    expect(countTextLineConflicts(plan!)).toBe(0)
  })

  it('omits the switch merge line when the switch is the terminal ASCII block', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    switch ( renderer type )
    case ( svg )
      :Generate svg;
    case ( canvas )
      :Draw canvas;
    endswitch
    `)

    const result = testDraw(code)
    const plan = result.graphicIR.rendererData?.ascii?.plan
    expect(plan).toBeTruthy()

    const text = renderTextDiagramPlan(plan!)
    expect(text).toContain('Generate svg')
    expect(text).toContain('Draw canvas')
    expect(text).toContain('< renderer type >')
    expect(text).not.toContain('┬')
    expect(text).toMatch(/< renderer type >[\s\S]*│/)
    expect(text).toMatch(/svg\s+[├┼┤─]+▼/)
    expect(text).toMatch(/▼[├┼┤─]+canvas/)
    expect(hasHorizontalLineBelowAllRects(plan!)).toBe(false)
  })

  it('keeps switch head clear and connects switch joins to the following end node', () => {
    const code = stripStartEmptyLines(`
    activityDiagram
    switch ( renderer type )
    case ( svg )
      :Generate svg;
    case ( canvas )
      :Draw canvas;
    case ( custom )
      :Custom renderer output;
    endswitch
    end
    `)

    const result = testDraw(code)
    const plan = result.graphicIR.rendererData?.ascii?.plan
    expect(plan).toBeTruthy()

    const switchLabel = plan!.ops.find(
      (op): op is TextDiagramTextOp => op.type === 'text' && op.text === '< renderer type >',
    )
    const endRect = plan!.ops.find(
      (op): op is Extract<TextDiagramOp, { type: 'rect' }> =>
        op.type === 'rect' &&
        plan!.ops.some(
          text =>
            text.type === 'text' &&
            text.text === 'end' &&
            text.x >= op.x &&
            text.x < op.x + op.width &&
            text.y >= op.y &&
            text.y < op.y + op.height,
        ),
    )

    expect(switchLabel).toBeTruthy()
    expect(endRect).toBeTruthy()
    expect(hasVerticalLineCell(plan!, switchLabel!.x, switchLabel!.y + 1)).toBe(false)

    const centerX = switchLabel!.x
    const mergeY = Math.max(
      ...plan!.ops
        .filter((op): op is TextDiagramLineOp => op.type === 'line' && op.from.y === op.to.y && op.from.y < endRect!.y)
        .map(op => op.from.y),
    )
    for (let y = mergeY + 1; y < endRect!.y; y++) {
      expect(hasLineCell(plan!, centerX, y)).toBe(true)
    }
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
    const ir = stripDrawResultForSnapshot(testDraw(code))
    delete ir.rendererData
    expect(ir).toMatchSnapshot()
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
    const ir = stripDrawResultForSnapshot(testDraw(code))
    delete ir.rendererData
    expect(ir).toMatchSnapshot()
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
})
