import type { TextDiagramOp, TextDiagramPlan } from '@pintora/core'
import { scaleTime } from 'd3-scale'
import dayjs from 'dayjs'
import { defaultConfig, type GanttConf } from '../config'
import { GanttIR, getAxisTimeInterval, Task } from '../db'
import { fillOp, lineOp, measureTextDiagramOps, textOp, widthOf } from '../../util/text-diagram'

const LABEL_GAP = 2
const MIN_TIMELINE_WIDTH = 24
const MAX_TIMELINE_WIDTH = 96
const MIN_TICK_GAP = 2
const TITLE_GAP = 2
const AXIS_TO_BODY_GAP = 2
const SECTION_PREFIX = '['
const SECTION_SUFFIX = ']'
const BAR_CHAR = '█'
const DONE_BAR_CHAR = '▓'
const MILESTONE_CHAR = '◆'

type GanttTextPlanOptions = {
  conf?: Partial<GanttConf>
}

type TextTask = Task & {
  renderEnd: Date
}

function isValidDate(date: Date | undefined | null): date is Date {
  return date instanceof Date && !Number.isNaN(Number(date))
}

function orderedTasks(ir: GanttIR): TextTask[] {
  return Object.values(ir.tasks)
    .filter(task => isValidDate(task.startTime) && isValidDate(task.renderEndTime || task.endTime))
    .sort((a, b) => a.order - b.order)
    .map(task => ({
      ...task,
      renderEnd: task.renderEndTime || task.endTime,
    }))
}

function maxTaskTextWidth(tasks: TextTask[]) {
  return tasks.reduce((maxWidth, task) => {
    const sectionWidth = task.section ? widthOf(`${SECTION_PREFIX}${task.section}${SECTION_SUFFIX}`) : 0
    return Math.max(maxWidth, sectionWidth, widthOf(task.label))
  }, 0)
}

function getTimeBounds(tasks: TextTask[]) {
  const startMs = Math.min(...tasks.map(task => Number(task.startTime)))
  const endMs = Math.max(...tasks.map(task => Number(task.renderEnd)))
  const start = new Date(startMs)
  let end = new Date(endMs)
  if (Number(end) <= Number(start)) {
    end = dayjs(start).add(1, 'day').toDate()
  }
  return { start, end }
}

function getTimelineTicks(ir: GanttIR, conf: Partial<GanttConf>, start: Date, end: Date) {
  const axisFormat = ir.attrs.axisFormat || conf.axisFormat || defaultConfig.axisFormat
  const timeInterval = getAxisTimeInterval({ axisFormat, axisInterval: ir.attrs.axisInterval })
  const ticks = scaleTime().domain([start, end]).ticks(timeInterval)
  const normalizedTicks = ticks.length ? ticks : [start, end]
  return normalizedTicks.map(date => ({
    date,
    label: dayjs(date).format(axisFormat),
  }))
}

function getTimelineWidth(ticks: Array<{ label: string }>, tasks: TextTask[]) {
  const maxTickLabelWidth = ticks.reduce((maxWidth, tick) => Math.max(maxWidth, widthOf(tick.label)), 0)
  const tickDrivenWidth = Math.max(0, ticks.length - 1) * (maxTickLabelWidth + MIN_TICK_GAP)
  const taskDrivenWidth = Math.max(MIN_TIMELINE_WIDTH, tasks.length * 6)
  return Math.min(MAX_TIMELINE_WIDTH, Math.max(MIN_TIMELINE_WIDTH, tickDrivenWidth, taskDrivenWidth))
}

function sectionLabel(section: string) {
  return `${SECTION_PREFIX}${section}${SECTION_SUFFIX}`
}

function hasTag(task: TextTask, tag: string) {
  return task.tags?.includes(tag)
}

function pushAxisOps(
  ops: TextDiagramOp[],
  ticks: Array<{ date: Date; label: string }>,
  opts: {
    axisY: number
    bodyBottomY: number
    labelWidth: number
    timelineWidth: number
    scale: (date: Date) => number
  },
) {
  const { axisY, bodyBottomY, labelWidth, timelineWidth, scale } = opts
  const axisLineY = axisY + 1
  const timelineLeft = labelWidth + LABEL_GAP
  const timelineRight = timelineLeft + timelineWidth - 1

  ops.push(lineOp({ x: timelineLeft, y: axisLineY }, { x: timelineRight, y: axisLineY }))

  let lastLabelRight = -Infinity
  ticks.forEach(tick => {
    const x = timelineLeft + scale(tick.date)
    ops.push(lineOp({ x, y: axisLineY }, { x, y: bodyBottomY }))

    const labelLeft = x - Math.floor(widthOf(tick.label) / 2)
    if (labelLeft > lastLabelRight + MIN_TICK_GAP) {
      ops.push(textOp(x, axisY, tick.label, 'center'))
      lastLabelRight = labelLeft + widthOf(tick.label) - 1
    }
  })
}

function pushTaskOps(
  ops: TextDiagramOp[],
  task: TextTask,
  opts: {
    y: number
    timelineLeft: number
    scale: (date: Date) => number
  },
) {
  const { y, timelineLeft, scale } = opts
  ops.push(textOp(2, y, task.label))

  const startX = timelineLeft + scale(task.startTime)
  const endX = timelineLeft + scale(task.renderEnd)
  if (hasTag(task, 'MILESTONE')) {
    ops.push(textOp(startX, y, MILESTONE_CHAR, 'center'))
    return
  }

  const char = hasTag(task, 'DONE') ? DONE_BAR_CHAR : BAR_CHAR
  ops.push(fillOp(Math.min(startX, endX), y, Math.max(1, Math.abs(endX - startX) + 1), 1, char))
}

function pushMarkDateOps(
  ops: TextDiagramOp[],
  ir: GanttIR,
  opts: {
    start: Date
    end: Date
    topY: number
    bottomY: number
    timelineLeft: number
    scale: (date: Date) => number
  },
) {
  const { start, end, topY, bottomY, timelineLeft, scale } = opts
  ir.markDates.forEach(date => {
    if (!isValidDate(date) || Number(date) < Number(start) || Number(date) > Number(end)) return
    const x = timelineLeft + scale(date)
    ops.push(lineOp({ x, y: topY }, { x, y: bottomY }, { stroke: 'dashed' }))
  })
}

export function toGanttTextDiagramPlan(ir: GanttIR, options: GanttTextPlanOptions = {}): TextDiagramPlan {
  const tasks = orderedTasks(ir)
  const title = ir.attrs.title?.trim()
  const ops: TextDiagramOp[] = []

  if (!tasks.length) {
    if (title) ops.push(textOp(Math.floor(widthOf(title) / 2), 0, title, 'center'))
    const measured = measureTextDiagramOps(ops, Math.max(1, title ? widthOf(title) : 1))
    return { ...measured, ops }
  }

  const { start, end } = getTimeBounds(tasks)
  const conf = options.conf || {}
  const ticks = getTimelineTicks(ir, conf, start, end)
  const timelineWidth = getTimelineWidth(ticks, tasks)
  const labelWidth = Math.max(maxTaskTextWidth(tasks) + 2, 8)
  const width = Math.max(labelWidth + LABEL_GAP + timelineWidth, title ? widthOf(title) : 0)
  const timelineLeft = labelWidth + LABEL_GAP
  const timeScale = scaleTime()
    .domain([start, end])
    .rangeRound([0, timelineWidth - 1])
  const scale = (date: Date) => Math.max(0, Math.min(timelineWidth - 1, timeScale(date)))

  let cursorY = 0
  if (title) {
    ops.push(textOp(Math.floor(width / 2), cursorY, title, 'center'))
    cursorY += TITLE_GAP
  }

  const axisY = cursorY
  cursorY += AXIS_TO_BODY_GAP

  let previousSection: string | undefined
  tasks.forEach(task => {
    if (task.section && task.section !== previousSection) {
      ops.push(textOp(0, cursorY, sectionLabel(task.section)))
      cursorY += 1
      previousSection = task.section
    }
    pushTaskOps(ops, task, { y: cursorY, timelineLeft, scale })
    cursorY += 1
  })

  const bodyBottomY = Math.max(axisY + 1, cursorY - 1)
  pushAxisOps(ops, ticks, {
    axisY,
    bodyBottomY,
    labelWidth,
    timelineWidth,
    scale,
  })
  pushMarkDateOps(ops, ir, {
    start,
    end,
    topY: axisY + 1,
    bottomY: bodyBottomY,
    timelineLeft,
    scale,
  })

  const measured = measureTextDiagramOps(ops, width)
  return {
    width: Math.max(width, measured.width),
    height: Math.max(1, measured.height),
    ops,
  }
}
