import { lineOp, rectOp, textOp, translateTextDiagramOps, widthOf } from '../../util/text-diagram'

type TextDiagramOp = import('@pintora/core').TextDiagramOp
type TextDiagramPlan = import('@pintora/core').TextDiagramPlan
type AGroup = import('../db').AGroup
type Action = import('../db').Action
type ActivityDiagramIR = import('../db').ActivityDiagramIR
type Case = import('../db').Case
type Condition = import('../db').Condition
type Fork = import('../db').Fork
type ForkBranch = import('../db').ForkBranch
type Keyword = import('../db').Keyword
type Note = import('../db').Note
type Repeat = import('../db').Repeat
type Step<T = any> = {
  type: string
  parentId?: string
  value: T
}
type Switch = import('../db').Switch
type While = import('../db').While
type Point = { x: number; y: number }

type ActivityTextBlock = {
  width: number
  height: number
  entry: Point
  exit: Point
  ops: TextDiagramOp[]
}

const MIN_BOX_WIDTH = 7
const BOX_HEIGHT = 3
const STACK_GAP = 2
const BRANCH_GAP = 6
const FRAME_PAD_X = 2
const FRAME_PAD_TOP = 2
const FRAME_PAD_BOTTOM = 1

function actionLabel(action: Action) {
  return action.message || action.actionType || action.id
}

function boxBlock(label: string, stroke?: 'solid' | 'dashed'): ActivityTextBlock {
  const width = Math.max(MIN_BOX_WIDTH, widthOf(label) + 4)
  const centerX = Math.floor(width / 2)
  return {
    width,
    height: BOX_HEIGHT,
    entry: { x: centerX, y: 0 },
    exit: { x: centerX, y: BOX_HEIGHT - 1 },
    ops: [rectOp(0, 0, width, BOX_HEIGHT, stroke), textOp(centerX, 1, label, 'center')],
  }
}

function switchHeadBlock(label: string): ActivityTextBlock {
  const text = `< ${label.trim()} >`
  const width = Math.max(MIN_BOX_WIDTH, widthOf(text) + 4)
  const centerX = Math.floor(width / 2)
  return {
    width,
    height: BOX_HEIGHT,
    entry: { x: centerX, y: 0 },
    exit: { x: centerX, y: BOX_HEIGHT - 1 },
    ops: [
      textOp(0, 0, '/'),
      lineOp({ x: 1, y: 0 }, { x: width - 2, y: 0 }),
      textOp(width - 1, 0, '\\'),
      textOp(centerX, 1, text, 'center'),
      textOp(0, 2, '\\'),
      lineOp({ x: 1, y: 2 }, { x: width - 2, y: 2 }),
      textOp(width - 1, 2, '/'),
    ],
  }
}

function keywordBlock(keyword: Keyword): ActivityTextBlock {
  return boxBlock(keyword.label)
}

function emptyBlock(): ActivityTextBlock {
  return boxBlock('(empty)', 'dashed')
}

function shiftBlock(block: ActivityTextBlock, dx: number, dy: number): ActivityTextBlock {
  return {
    ...block,
    entry: { x: block.entry.x + dx, y: block.entry.y + dy },
    exit: { x: block.exit.x + dx, y: block.exit.y + dy },
    ops: translateTextDiagramOps(block.ops, dx, dy),
  }
}

function connect(ops: TextDiagramOp[], from: Point, to: Point, label = '') {
  const pushLine = (
    lineFrom: Point,
    lineTo: Point,
    extra: Pick<Extract<TextDiagramOp, { type: 'line' }>, 'stroke' | 'startHead' | 'endHead'> = {},
  ) => {
    if (lineFrom.x === lineTo.x && lineFrom.y === lineTo.y) return
    ops.push(lineOp(lineFrom, lineTo, extra))
  }

  if (from.x === to.x) {
    const startY = Math.min(from.y + 1, to.y)
    const endY = Math.max(startY, to.y - 1)
    pushLine({ x: from.x, y: startY }, { x: to.x, y: endY }, { endHead: 'filled' })
    if (label) ops.push(textOp(from.x + 2, Math.max(from.y + 1, to.y - 1), label))
    return
  }

  const midY = Math.floor((from.y + to.y) / 2)
  if (midY > from.y) pushLine({ x: from.x, y: from.y + 1 }, { x: from.x, y: midY })
  pushLine({ x: from.x, y: midY }, { x: to.x, y: midY })
  pushLine({ x: to.x, y: midY }, { x: to.x, y: to.y - 1 }, { endHead: 'filled' })
  if (label) {
    const labelX = to.x >= from.x ? to.x + 2 : to.x - widthOf(label) - 1
    ops.push(textOp(labelX, midY + 1, label))
  }
}

function connectSwitchBranchStart(ops: TextDiagramOp[], from: Point, to: Point, label = '') {
  const busY = to.y - 2
  const arrowY = to.y - 1
  ops.push(lineOp({ x: from.x, y: from.y + 1 }, { x: from.x, y: busY }))
  if (to.x < from.x) {
    ops.push(lineOp({ x: from.x, y: busY }, { x: to.x + 1, y: busY }))
  } else if (to.x > from.x) {
    ops.push(lineOp({ x: from.x, y: busY }, { x: to.x - 1, y: busY }))
  }

  if (label) {
    if (to.x < from.x) {
      const labelX = Math.max(0, to.x - widthOf(label) - 3)
      ops.push(textOp(labelX, arrowY, label))
      ops.push(lineOp({ x: labelX + widthOf(label) + 1, y: arrowY }, { x: to.x - 1, y: arrowY }))
    } else {
      const labelX = to.x + 3
      ops.push(lineOp({ x: to.x + 1, y: arrowY }, { x: labelX - 1, y: arrowY }))
      ops.push(textOp(labelX, arrowY, label))
    }
  }

  ops.push(lineOp({ x: to.x, y: busY }, { x: to.x, y: arrowY }, { endHead: 'filled' }))
}

function connectBranchJoin(ops: TextDiagramOp[], from: Point, to: Point) {
  if (from.x === to.x) {
    ops.push(lineOp({ x: from.x, y: from.y + 1 }, to))
    return
  }

  ops.push(lineOp({ x: from.x, y: from.y + 1 }, { x: from.x, y: to.y }))
  ops.push(lineOp({ x: from.x, y: to.y }, to))
}

function stackBlocks(blocks: ActivityTextBlock[], labels: string[] = []): ActivityTextBlock {
  const visibleBlocks = blocks.length ? blocks : [emptyBlock()]
  const width = Math.max(...visibleBlocks.map(block => block.width))
  const centerX = Math.floor(width / 2)
  let y = 0
  const placed = visibleBlocks.map(block => {
    const shifted = shiftBlock(block, centerX - block.entry.x, y)
    y += block.height + STACK_GAP
    return shifted
  })

  const ops = placed.flatMap(block => block.ops)
  for (let i = 1; i < placed.length; i++) {
    connect(ops, placed[i - 1].exit, placed[i].entry, labels[i - 1] || '')
  }

  return {
    width,
    height: y - STACK_GAP,
    entry: placed[0].entry,
    exit: placed[placed.length - 1].exit,
    ops,
  }
}

function branchBlock(
  branches: Array<{ label: string; block: ActivityTextBlock }>,
  head: ActivityTextBlock,
  opts: { alignMiddleBranchToHead?: boolean; drawJoin?: boolean; startConnector?: 'direct' | 'switch' } = {},
) {
  const drawJoin = opts.drawJoin ?? true
  const startConnector = opts.startConnector || 'direct'
  const safeBranches = branches.length ? branches : [{ label: '', block: emptyBlock() }]
  const branchStartY = head.height + STACK_GAP + (startConnector === 'switch' ? 1 : 0)
  let x = 0
  const placedBranches = safeBranches.map(branch => {
    const shifted = shiftBlock(branch.block, x, branchStartY)
    x += branch.block.width + BRANCH_GAP
    return { ...branch, block: shifted }
  })
  const branchWidth = x - BRANCH_GAP
  const middleBranchIndex =
    opts.alignMiddleBranchToHead && safeBranches.length % 2 === 1 ? Math.floor(safeBranches.length / 2) : -1
  let width = Math.max(head.width, branchWidth)
  let headX = Math.floor((width - head.width) / 2)
  let branchX = Math.floor((width - branchWidth) / 2)
  if (middleBranchIndex >= 0) {
    const middleEntryX = placedBranches[middleBranchIndex].block.entry.x
    branchX = 0
    headX = middleEntryX - head.exit.x
    if (headX < 0) {
      branchX = -headX
      headX = 0
    }
    width = Math.max(headX + head.width, branchX + branchWidth)
  }
  const placedHead = shiftBlock(head, headX, 0)
  const normalizedBranches = placedBranches.map(branch => ({
    ...branch,
    block: shiftBlock(branch.block, branchX, 0),
  }))

  const joinY = Math.max(...normalizedBranches.map(branch => branch.block.exit.y)) + STACK_GAP
  const exit = { x: placedHead.exit.x, y: joinY }
  const ops = [...placedHead.ops, ...normalizedBranches.flatMap(branch => branch.block.ops)]

  normalizedBranches.forEach(branch => {
    if (startConnector === 'switch') {
      connectSwitchBranchStart(ops, placedHead.exit, branch.block.entry, branch.label)
    } else {
      connect(ops, placedHead.exit, branch.block.entry, branch.label)
    }
    if (drawJoin) connectBranchJoin(ops, branch.block.exit, exit)
  })

  return {
    width,
    height: drawJoin ? joinY + 1 : Math.max(...normalizedBranches.map(branch => branch.block.exit.y)) + 1,
    entry: placedHead.entry,
    exit,
    ops,
  }
}

function conditionBlock(condition: Condition, renderSteps: (steps: Step[]) => ActivityTextBlock): ActivityTextBlock {
  const branches = [
    {
      label: condition.then.label || 'yes',
      block: renderSteps(condition.then.children),
    },
  ]
  if (condition.else) {
    branches.push({
      label: condition.else.label || 'no',
      block: renderSteps(condition.else.children),
    })
  }
  return branchBlock(branches, boxBlock(condition.message))
}

function switchBlock(s: Switch, renderStep: (step: Step) => ActivityTextBlock, hasNext: boolean): ActivityTextBlock {
  return branchBlock(
    s.children.map((step: Step<Case>) => ({
      label: step.value.confirmLabel || '',
      block: renderStep(step),
    })),
    switchHeadBlock(s.message || 'switch'),
    { alignMiddleBranchToHead: true, drawJoin: hasNext, startConnector: 'switch' },
  )
}

function whileBlock(wh: While, renderSteps: (steps: Step[]) => ActivityTextBlock): ActivityTextBlock {
  const head = boxBlock(wh.message)
  const body = renderSteps(wh.children)
  const stacked = stackBlocks([head, body], [wh.confirmLabel || 'yes'])
  const ops = stacked.ops.slice()
  const returnX = stacked.width + 3
  const loopBottomY = stacked.exit.y + 1
  const headRightX = Math.floor((stacked.width - head.width) / 2) + head.width
  const headMiddleY = head.entry.y + 1
  ops.push(lineOp({ x: stacked.exit.x, y: stacked.exit.y + 1 }, { x: stacked.exit.x, y: loopBottomY }))
  ops.push(lineOp({ x: stacked.exit.x, y: loopBottomY }, { x: returnX, y: loopBottomY }))
  ops.push(lineOp({ x: returnX, y: loopBottomY }, { x: returnX, y: headMiddleY }))
  ops.push(lineOp({ x: returnX, y: headMiddleY }, { x: headRightX + 1, y: headMiddleY }, { endHead: 'filled' }))
  if (wh.denyLabel) ops.push(textOp(head.exit.x + 2, head.exit.y + 1, wh.denyLabel))
  return { ...stacked, height: Math.max(stacked.height, loopBottomY + 1), width: returnX + 1, ops }
}

function repeatBlock(repeat: Repeat, renderSteps: (steps: Step[]) => ActivityTextBlock): ActivityTextBlock {
  const blocks: ActivityTextBlock[] = []
  if (repeat.firstAction) blocks.push(boxBlock(actionLabel(repeat.firstAction)))
  blocks.push(renderSteps(repeat.children), boxBlock(repeat.message))
  const stacked = stackBlocks(blocks)
  const ops = stacked.ops.slice()
  const first = blocks.length ? stacked.entry : { x: 0, y: 0 }
  const decisionExit = stacked.exit
  const returnX = 0
  ops.push(lineOp({ x: decisionExit.x, y: decisionExit.y }, { x: returnX, y: decisionExit.y }))
  ops.push(lineOp({ x: returnX, y: decisionExit.y }, { x: returnX, y: first.y + 1 }))
  ops.push(lineOp({ x: returnX, y: first.y + 1 }, { x: first.x - 1, y: first.y + 1 }, { endHead: 'filled' }))
  if (repeat.confirmLabel) ops.push(textOp(1, decisionExit.y - 1, repeat.confirmLabel))
  return {
    ...stacked,
    exit: decisionExit,
    width: stacked.width,
    ops,
  }
}

function caseBlock(c: Case, renderSteps: (steps: Step[]) => ActivityTextBlock): ActivityTextBlock {
  return renderSteps(c.children)
}

function forkBlock(fork: Fork, renderStep: (step: Step) => ActivityTextBlock): ActivityTextBlock {
  const branches = fork.branches.map((branch: Step<ForkBranch>) => ({
    label: '',
    block: renderStep(branch),
  }))
  const block = branchBlock(branches, boxBlock('fork'))
  const ops = block.ops.filter(op => !(op.type === 'text' && op.text === 'fork'))
  ops.push(lineOp({ x: 1, y: 1 }, { x: block.width - 2, y: 1 }))
  if (!fork.shouldMerge) ops.push(lineOp({ x: 1, y: block.exit.y }, { x: block.width - 2, y: block.exit.y }))
  return { ...block, ops }
}

function groupBlock(group: AGroup, renderSteps: (steps: Step[]) => ActivityTextBlock): ActivityTextBlock {
  const child = renderSteps(group.children)
  const label = group.label || group.name
  const width = Math.max(child.width + FRAME_PAD_X * 2, widthOf(label) + 4)
  const shiftedChild = shiftBlock(child, Math.floor((width - child.width) / 2), FRAME_PAD_TOP)
  const height = shiftedChild.height + FRAME_PAD_TOP + FRAME_PAD_BOTTOM
  return {
    width,
    height,
    entry: shiftedChild.entry,
    exit: shiftedChild.exit,
    ops: [rectOp(0, 0, width, height, 'dashed'), textOp(2, 0, label), ...shiftedChild.ops],
  }
}

function noteBox(note: Note) {
  return boxBlock(note.text, 'dashed')
}

function attachNotes(block: ActivityTextBlock, notes: Note[], placement: string | undefined) {
  if (!notes.length) return block
  const noteBlock = stackBlocks(notes.map(note => noteBox(note)))
  const gap = 3
  const noteOnLeft = placement === 'left'
  const width = block.width + gap + noteBlock.width
  const mainX = noteOnLeft ? noteBlock.width + gap : 0
  const noteX = noteOnLeft ? 0 : block.width + gap
  const main = shiftBlock(block, mainX, 0)
  const noteY = Math.max(0, main.entry.y)
  const note = shiftBlock(noteBlock, noteX, noteY)
  const ops = [...main.ops, ...note.ops]
  const connectorY = Math.min(main.entry.y + 1, note.entry.y + 1)
  const connectorFrom = noteOnLeft
    ? { x: noteX + noteBlock.width - 1, y: connectorY }
    : { x: mainX + block.width - 1, y: connectorY }
  const connectorTo = noteOnLeft ? { x: mainX, y: connectorY } : { x: noteX, y: connectorY }
  ops.push(lineOp(connectorFrom, connectorTo, { stroke: 'dashed' }))
  return {
    width,
    height: Math.max(main.height, note.height + noteY),
    entry: main.entry,
    exit: main.exit,
    ops,
  }
}

function planSize(ops: TextDiagramOp[], fallbackWidth: number) {
  let width = fallbackWidth
  let height = 1
  ops.forEach(op => {
    if (op.type === 'text') {
      const textWidth = widthOf(op.text)
      const left =
        op.align === 'center' ? op.x - Math.floor(textWidth / 2) : op.align === 'right' ? op.x - textWidth + 1 : op.x
      width = Math.max(width, left + textWidth)
      height = Math.max(height, op.y + 1)
    } else if (op.type === 'rect' || op.type === 'fill') {
      width = Math.max(width, op.x + op.width)
      height = Math.max(height, op.y + op.height)
    } else {
      width = Math.max(width, op.from.x + 1, op.to.x + 1)
      height = Math.max(height, op.from.y + 1, op.to.y + 1)
    }
  })
  return { width: Math.max(1, width), height: Math.max(1, height) }
}

export function toActivityTextDiagramPlan(ir: ActivityDiagramIR): TextDiagramPlan {
  const notesByTarget = new Map<string, Note[]>()
  ir.notes.forEach(note => {
    if (!note.target) return
    const notes = notesByTarget.get(note.target) || []
    notes.push(note)
    notesByTarget.set(note.target, notes)
  })

  const arrowLabelByTarget = new Map(ir.arrowLabels.map(label => [label.target, label.text]))

  const renderSteps = (steps: Step[]) =>
    stackBlocks(
      steps.map((step, index) => renderStep(step, { hasNext: index < steps.length - 1 })),
      steps.map(step => arrowLabelByTarget.get((step.value as { id?: string }).id) || ''),
    )

  const renderStep = (step: Step, opts: { hasNext?: boolean } = {}): ActivityTextBlock => {
    let block: ActivityTextBlock
    switch (step.type) {
      case 'action':
        block = boxBlock(actionLabel(step.value as Action))
        break
      case 'condition':
        block = conditionBlock(step.value as Condition, renderSteps)
        break
      case 'while':
        block = whileBlock(step.value as While, renderSteps)
        break
      case 'repeat':
        block = repeatBlock(step.value as Repeat, renderSteps)
        break
      case 'switch':
        block = switchBlock(step.value as Switch, renderStep, opts.hasNext || false)
        break
      case 'case':
        block = caseBlock(step.value as Case, renderSteps)
        break
      case 'group':
        block = groupBlock(step.value as AGroup, renderSteps)
        break
      case 'keyword':
        block = keywordBlock(step.value as Keyword)
        break
      case 'fork':
        block = forkBlock(step.value as Fork, renderStep)
        break
      case 'forkBranch':
        block = renderSteps((step.value as ForkBranch).children)
        break
      default:
        block = emptyBlock()
        break
    }

    const id = (step.value as { id?: string }).id
    return id ? attachNotes(block, notesByTarget.get(id) || [], (notesByTarget.get(id) || [])[0]?.placement) : block
  }

  const titleOffset = ir.title ? 2 : 0
  const body = shiftBlock(renderSteps(ir.steps), 0, titleOffset)
  const orphanNotes = ir.notes.filter(note => !note.target).map(note => noteBox(note))
  const fullBody = orphanNotes.length ? stackBlocks([body, ...orphanNotes]) : body
  const ops = fullBody.ops.slice()
  if (ir.title) ops.unshift(textOp(Math.floor(fullBody.width / 2), 0, ir.title, 'center'))
  const size = planSize(ops, Math.max(fullBody.width, widthOf(ir.title || '')))

  return {
    width: size.width,
    height: size.height,
    ops,
  }
}
