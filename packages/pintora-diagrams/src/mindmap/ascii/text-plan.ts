import type { TextDiagramOp, TextDiagramPlan } from '@pintora/core'
import {
  lineOp,
  measureTextDiagramOps,
  rectOp,
  textOp,
  translateTextDiagramOps,
  widthOf,
} from '../../util/text-diagram'
import type { IMMDataTree, MindmapIR, MMItem } from '../db'

type Direction = 'left' | 'right'
type Point = { x: number; y: number }

type TextBlock = {
  width: number
  height: number
  ops: TextDiagramOp[]
  rootLeft: number
  rootRight: number
  rootCenterY: number
}

type ForestBlock = TextBlock & {
  childAnchors: Array<{ left: number; right: number; centerY: number }>
}

const NODE_PAD_X = 2
const NODE_PAD_Y = 1
const LEVEL_GAP = 6
const SIBLING_GAP = 2
const TREE_GAP = 2
const TITLE_GAP = 2
const MIN_NODE_WIDTH = 5

function normalizeLabel(label: string) {
  const lines = label
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  return lines.length ? lines : ['']
}

function nodeSize(node: MMItem) {
  const lines = normalizeLabel(node.label)
  const textWidth = lines.reduce((max, line) => Math.max(max, widthOf(line)), 0)
  return {
    lines,
    width: Math.max(MIN_NODE_WIDTH, textWidth + NODE_PAD_X * 2),
    height: lines.length + NODE_PAD_Y * 2,
  }
}

function nodeOps(node: MMItem, x: number, y: number) {
  const { lines, width, height } = nodeSize(node)
  const ops: TextDiagramOp[] = [rectOp(x, y, width, height)]
  lines.forEach((line, index) => {
    ops.push(textOp(x + Math.floor(width / 2), y + NODE_PAD_Y + index, line, 'center'))
  })
  return ops
}

function childNodes(tree: IMMDataTree, node: MMItem) {
  return node.children.map(id => tree.nodes[id]).filter(Boolean)
}

function pushConnector(ops: TextDiagramOp[], from: Point, to: Point, direction: Direction) {
  const pushLine = (lineFrom: Point, lineTo: Point, endHead = false) => {
    if (lineFrom.x === lineTo.x && lineFrom.y === lineTo.y) return
    ops.push(lineOp(lineFrom, lineTo, endHead ? { endHead: 'filled' } : {}))
  }

  if (from.y === to.y) {
    pushLine(from, to, true)
    return
  }

  const midX =
    direction === 'right'
      ? Math.max(from.x, Math.min(to.x, Math.floor((from.x + to.x) / 2)))
      : Math.min(from.x, Math.max(to.x, Math.floor((from.x + to.x) / 2)))
  pushLine(from, { x: midX, y: from.y })
  pushLine({ x: midX, y: from.y }, { x: midX, y: to.y })
  pushLine({ x: midX, y: to.y }, to, true)
}

function stackHeight(blocks: TextBlock[]) {
  if (!blocks.length) return 0
  return blocks.reduce((sum, block) => sum + block.height, 0) + (blocks.length - 1) * SIBLING_GAP
}

function layoutOutward(tree: IMMDataTree, node: MMItem, direction: Direction): TextBlock {
  const children = childNodes(tree, node)
  const childBlocks = children.map(child => layoutOutward(tree, child, direction))
  const { width: nodeWidth, height: nodeHeight } = nodeSize(node)
  const childWidth = childBlocks.reduce((max, block) => Math.max(max, block.width), 0)
  const childHeight = stackHeight(childBlocks)
  const height = Math.max(nodeHeight, childHeight || 0)
  const width = childBlocks.length ? nodeWidth + LEVEL_GAP + childWidth : nodeWidth
  const nodeY = Math.floor((height - nodeHeight) / 2)
  const nodeX = direction === 'right' ? 0 : childBlocks.length ? childWidth + LEVEL_GAP : 0
  const ops = nodeOps(node, nodeX, nodeY)
  const rootLeft = nodeX
  const rootRight = nodeX + nodeWidth - 1
  const rootCenterY = nodeY + Math.floor(nodeHeight / 2)

  let cursorY = Math.floor((height - childHeight) / 2)
  childBlocks.forEach(block => {
    const childX = direction === 'right' ? nodeWidth + LEVEL_GAP : childWidth - block.width
    ops.push(...translateTextDiagramOps(block.ops, childX, cursorY))
    const from = direction === 'right' ? { x: rootRight + 1, y: rootCenterY } : { x: rootLeft - 1, y: rootCenterY }
    const to =
      direction === 'right'
        ? { x: childX + block.rootLeft - 1, y: cursorY + block.rootCenterY }
        : { x: childX + block.rootRight + 1, y: cursorY + block.rootCenterY }
    pushConnector(ops, from, to, direction)
    cursorY += block.height + SIBLING_GAP
  })

  return { width, height, ops, rootLeft, rootRight, rootCenterY }
}

function layoutForest(tree: IMMDataTree, nodes: MMItem[], direction: Direction): ForestBlock {
  const blocks = nodes.map(node => layoutOutward(tree, node, direction))
  const width = blocks.reduce((max, block) => Math.max(max, block.width), 0)
  const height = stackHeight(blocks)
  const ops: TextDiagramOp[] = []
  const childAnchors: Array<{ left: number; right: number; centerY: number }> = []
  let cursorY = 0
  blocks.forEach(block => {
    const dx = direction === 'right' ? 0 : width - block.width
    ops.push(...translateTextDiagramOps(block.ops, dx, cursorY))
    childAnchors.push({
      left: dx + block.rootLeft,
      right: dx + block.rootRight,
      centerY: cursorY + block.rootCenterY,
    })
    cursorY += block.height + SIBLING_GAP
  })

  return {
    width,
    height,
    ops,
    rootLeft: childAnchors[0]?.left || 0,
    rootRight: childAnchors[0]?.right || 0,
    rootCenterY: childAnchors[0]?.centerY || 0,
    childAnchors,
  }
}

function sideForestY(forest: ForestBlock, childCount: number, rootCenterY: number, fallbackHeight: number) {
  if (childCount === 1) return rootCenterY - forest.rootCenterY
  return Math.floor((fallbackHeight - forest.height) / 2)
}

function layoutTree(tree: IMMDataTree): TextBlock {
  const root = tree.nodes[tree.root]
  const { width: rootWidth, height: rootHeight } = nodeSize(root)
  const children = childNodes(tree, root)
  const leftChildren = children.filter(child => child.isReverse)
  const rightChildren = children.filter(child => !child.isReverse)
  const left = leftChildren.length ? layoutForest(tree, leftChildren, 'left') : null
  const right = rightChildren.length ? layoutForest(tree, rightChildren, 'right') : null
  const leftGap = left ? LEVEL_GAP : 0
  const rightGap = right ? LEVEL_GAP : 0
  const width = (left?.width || 0) + leftGap + rootWidth + rightGap + (right?.width || 0)
  const height = Math.max(rootHeight, left?.height || 0, right?.height || 0)
  const rootX = (left?.width || 0) + leftGap
  const rootY = Math.floor((height - rootHeight) / 2)
  const rootCenterY = rootY + Math.floor(rootHeight / 2)
  const ops = nodeOps(root, rootX, rootY)
  let minY = Math.min(0, rootY)
  let maxY = Math.max(height - 1, rootY + rootHeight - 1)

  if (left) {
    const leftY = sideForestY(left, leftChildren.length, rootCenterY, height)
    minY = Math.min(minY, leftY)
    maxY = Math.max(maxY, leftY + left.height - 1)
    ops.push(...translateTextDiagramOps(left.ops, 0, leftY))
    left.childAnchors.forEach(anchor => {
      const from = { x: rootX - 1, y: rootCenterY }
      const to = {
        x: anchor.right + 1,
        y: leftY + anchor.centerY,
      }
      pushConnector(ops, from, to, 'left')
    })
  }

  if (right) {
    const rightX = rootX + rootWidth + rightGap
    const rightY = sideForestY(right, rightChildren.length, rootCenterY, height)
    minY = Math.min(minY, rightY)
    maxY = Math.max(maxY, rightY + right.height - 1)
    ops.push(...translateTextDiagramOps(right.ops, rightX, rightY))
    right.childAnchors.forEach(anchor => {
      const from = { x: rootX + rootWidth, y: rootCenterY }
      const to = {
        x: rightX + anchor.left - 1,
        y: rightY + anchor.centerY,
      }
      pushConnector(ops, from, to, 'right')
    })
  }

  const yShift = minY < 0 ? -minY : 0
  return {
    width,
    height: maxY - minY + 1,
    ops: yShift ? translateTextDiagramOps(ops, 0, yShift) : ops,
    rootLeft: rootX,
    rootRight: rootX + rootWidth - 1,
    rootCenterY: rootCenterY + yShift,
  }
}

export function toMindmapTextDiagramPlan(ir: MindmapIR): TextDiagramPlan {
  const treeBlocks = ir.trees.map(layoutTree)
  const title = ir.title?.trim()
  const titleWidth = title ? widthOf(title) : 0
  const contentWidth = treeBlocks.reduce((max, block) => Math.max(max, block.width), 1)
  const width = Math.max(contentWidth, titleWidth, 1)
  const ops: TextDiagramOp[] = []
  let cursorY = 0

  if (title) {
    ops.push(textOp(Math.floor(width / 2), 0, title, 'center'))
    cursorY += TITLE_GAP
  }

  treeBlocks.forEach(block => {
    const dx = Math.floor((width - block.width) / 2)
    ops.push(...translateTextDiagramOps(block.ops, dx, cursorY))
    cursorY += block.height + TREE_GAP
  })

  const measured = measureTextDiagramOps(ops, width)
  return {
    width: Math.max(width, measured.width),
    height: Math.max(1, measured.height),
    ops,
  }
}
