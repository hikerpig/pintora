import {
  calculateTextDimensions,
  GraphicsIR,
  Group,
  IFont,
  makeMark,
  Mark,
  MarkAttrs,
  Point,
  Rect,
  safeAssign,
  Text,
  TSize,
  makeArtist,
  min,
  max,
} from '@pintora/core'
import { scaleTime, ScaleTime } from 'd3-scale'
import dayjs from 'dayjs'
import { drawDiamondTo, LayerManager, makeEmptyGroup } from '../util/artist-util'
import { isDev } from '../util/env'
import { GanttConf, getConf } from './config'
import { GanttIR, getAxisTimeInterval, isInvalidDate, Task } from './db'
import { getFontConfig } from '../util/font-config'

const artist = makeArtist<GanttIR, GanttConf>({
  draw(ir, config, opts) {
    const conf = getConf(ir, config)

    const rootMark = makeEmptyGroup()

    let w = 1000
    if (opts.containerSize?.width) {
      w = opts.containerSize.width
    }

    const ganttDraw = new GanttDraw(ir, conf, rootMark, w)
    ganttDraw.makeGant()

    const size = ganttDraw.getPageSize()
    const { width, height } = size

    return {
      mark: rootMark,
      width,
      height,
    } as GraphicsIR
  },
})

const GANTT_LAYER_CONFIG = {
  sectionBackground: 1,
  excludesBackground: 2,
  gridLine: 5,
  bar: 10,
  markLine: 15,
  title: 15,
}

type GanttLayerName = keyof typeof GANTT_LAYER_CONFIG

class GanttDraw {
  protected taskArray: Task[]
  protected width: number
  protected height: number
  protected timeScale: ScaleTime<number, number>
  protected startDate: Date
  protected endDate: Date
  protected ticks: Array<{ date: Date; label: string; labelWidth: number }>
  protected fontConfig: IFont
  protected sectionLabelWidth = 0
  protected titleTextDims: TSize
  protected categories: string[]
  protected layerManager = new LayerManager<GanttLayerName>()
  constructor(
    public ir: GanttIR,
    public conf: GanttConf,
    public rootMark: Group,
    w: number,
  ) {
    if (isDev) {
      ;(window as any).ganttDraw = this
    }

    const taskArray = Object.values(ir.tasks)
    this.taskArray = taskArray

    this.startDate = new Date(
      min(taskArray, function (d) {
        return Number(d.startTime)
      }),
    )
    this.endDate = new Date(
      max(taskArray, function (d) {
        return Number(d.renderEndTime || d.endTime)
      }),
    )

    this.fontConfig = getFontConfig(conf)
    const categories = taskArray.map(task => task.section)
    this.categories = categories
    const sectionLabelWidths = categories.reduce((acc, section) => {
      if (!acc[section]) {
        acc[section] = section ? calculateTextDimensions(section, this.fontConfig).width : 0
      }
      return acc
    }, {})
    const sectionLabelMaxWidth = (Object.values(sectionLabelWidths) as number[]).reduce(
      (acc: number, current: number) => {
        return Math.max(acc, current)
      },
      0,
    )
    this.sectionLabelWidth = Math.round(sectionLabelMaxWidth ? sectionLabelMaxWidth + 5 : 0)

    const makeTimeScaleAndTicks = (width: number) => {
      const axisFormat = this.ir.attrs.axisFormat || this.conf.axisFormat
      const sampleLabelWidth = calculateTextDimensions(dayjs().format(axisFormat), {
        fontSize: conf.axisLabelFontSize,
      }).width

      // get time interval from axisFormat and date range
      const timeInterval = getAxisTimeInterval({ axisFormat, axisInterval: this.ir.attrs.axisInterval })

      const timeScale = scaleTime()
        .domain([this.startDate, this.endDate])
        .rangeRound([0, width - conf.sidePadding * 2 - this.sectionLabelWidth - sampleLabelWidth / 4])

      const ticks = timeScale.ticks(timeInterval).map(date => {
        const day = dayjs(date)
        const label = day.format(axisFormat)
        const labelWidth = calculateTextDimensions(label, { fontSize: conf.axisLabelFontSize }).width
        return {
          date,
          label,
          labelWidth,
        }
      })

      return { timeScale, ticks }
    }

    const { ticks: tempTicks } = makeTimeScaleAndTicks(w)

    const axisLabelGap = conf.axisLabelFontSize / 2
    const minWidth =
      tempTicks.reduce((acc, tick) => acc + tick.labelWidth + axisLabelGap, 0) +
      conf.sidePadding * 2 +
      sectionLabelMaxWidth

    this.titleTextDims = ir.attrs.title
      ? calculateTextDimensions(ir.attrs.title, this.fontConfig)
      : { width: 0, height: 0 }
    const h =
      taskArray.length * (conf.barHeight + conf.barGap) +
      2 * conf.topPadding +
      conf.gridLineStartPadding +
      conf.axisLabelFontSize +
      this.titleTextDims.height
    this.height = h
    this.width = Math.max(w, minWidth)

    const { timeScale, ticks } = makeTimeScaleAndTicks(this.width)
    this.timeScale = timeScale
    this.ticks = ticks

    for (const [name, zIndex] of Object.entries(GANTT_LAYER_CONFIG)) {
      this.layerManager.addLayer(name as GanttLayerName, zIndex)
    }
  }

  getPageSize() {
    return { width: this.width, height: this.height }
  }

  makeGant() {
    const { taskArray } = this

    const { conf } = this
    const barHeight = conf.barHeight
    const gap = barHeight + conf.barGap

    this.drawTitle()
    const { sectionsHeight } = this.drawSections(taskArray, gap)
    this.drawExcludeDays({ sectionsHeight })
    this.drawGrid({ sectionsHeight })
    this.drawMarkDates({ sectionsHeight })

    this.rootMark.children = this.layerManager.sortLayerMarks()
  }

  protected getScaledTimeX(v: Date) {
    return Math.round(this.timeScale(v))
  }

  // diagram title
  protected drawTitle() {
    const title = this.ir.attrs.title
    if (title) {
      const titleWidth = this.titleTextDims.width
      const titleMark = makeMark('text', {
        text: title,
        x: (this.width - titleWidth) / 2,
        y: this.conf.topPadding,
        fill: this.conf.fontColor,
        textBaseline: 'middle',
        ...this.fontConfig,
        fontWeight: 'bold',
      })
      this.layerManager.addMark('title', titleMark)
    }
  }

  /**
   * draw axis labels and grids
   */
  protected drawGrid(opts: { sectionsHeight: number }) {
    const gridGroup = makeEmptyGroup()
    gridGroup.class = 'gantt__grid'
    this.layerManager.addMark('gridLine', gridGroup)

    const { axisLabelColor, gridLineColor, axisLabelFontSize, topPadding, sidePadding, gridLineStartPadding } =
      this.conf

    const axisLabelTopMargin = 10
    const titleHeight = this.titleTextDims.height || 0
    const yStart = topPadding + titleHeight
    const yAxisHeight = opts.sectionsHeight + gridLineStartPadding

    this.ticks.forEach(o => {
      const { date: tickDate, label } = o
      const x1 = this.getScaledTimeX(tickDate) + sidePadding + this.sectionLabelWidth
      const lineEndY = yStart + yAxisHeight
      const line = makeMark('line', {
        x1,
        x2: x1,
        y1: yStart,
        y2: lineEndY,
        stroke: gridLineColor,
      })

      const textMark = makeMark('text', {
        text: label,
        fill: axisLabelColor,
        textAlign: 'center',
        textBaseline: 'top',
        x: x1,
        y: lineEndY + axisLabelTopMargin,
        fontSize: axisLabelFontSize,
      })
      gridGroup.children.push(line, textMark)
    })
    // TODO: top axis
  }

  protected drawSections(taskArray: Task[], sectionUnitHeight: number) {
    const { conf } = this
    const w = this.width

    const sectionBackgrounGroup = makeEmptyGroup()
    const { gridLineStartPadding, gridLineWidth, sectionBackgrounds, sidePadding, topPadding, barHeight, barGap } = conf
    const yStart = gridLineStartPadding + topPadding + (this.titleTextDims.height || 0)

    this.layerManager.addMark('sectionBackground', sectionBackgrounGroup)

    const sectionsMap = new Map<
      string,
      {
        backgroundRect: Rect
        taskCount: number
        labelMark: Text | undefined
      }
    >()

    const taskXOffset = this.sectionLabelWidth + sidePadding

    taskArray.forEach((task, i) => {
      const sectionGroup = makeEmptyGroup()
      this.layerManager.addMark('bar', sectionGroup)

      if (!sectionsMap.get(task.section)) {
        const sectionBackground = sectionBackgrounds[sectionsMap.size % sectionBackgrounds.length] || 'transparent'
        const sectionY = task.order * sectionUnitHeight + yStart
        const sectionRect = makeMark(
          'rect',
          {
            x: 0,
            y: sectionY,
            width: w,
            height: sectionUnitHeight,
            fill: sectionBackground,
          },
          { class: 'gantt__section' },
        )
        sectionBackgrounGroup.children.push(sectionRect)

        let labelMark: Text | undefined
        if (task.section) {
          labelMark = makeMark('text', {
            text: task.section,
            x: sidePadding,
            y: sectionY + sectionUnitHeight / 2,
            ...this.fontConfig,
            fill: conf.sectionLabelColor,
            textAlign: 'left',
            textBaseline: 'middle',
          })
          sectionBackgrounGroup.children.push(labelMark)
        }

        sectionsMap.set(task.section, { backgroundRect: sectionRect, taskCount: 0, labelMark })
      }

      sectionsMap.get(task.section).taskCount += 1

      const taskX = taskXOffset + this.getScaledTimeX(task.startTime)
      const barStartX = taskXOffset + this.getScaledTimeX(task.startTime)
      let barEndX = taskXOffset + this.getScaledTimeX(task.renderEndTime || task.endTime)
      let barWidth = barEndX - barStartX

      const baseAttrs: Partial<MarkAttrs> = {
        radius: conf.barBorderRadius,
        x: taskX,
        y: task.order * sectionUnitHeight + yStart + barGap / 2,
        width: barWidth,
        height: barHeight,
        fill: conf.barBackground,
        stroke: conf.barBorderColor,
      }

      const taskRect = makeMark('rect', { ...baseAttrs })
      const appearanceInfo = getTaskAppearanceInfo({
        baseAttrs,
        task,
        taskMark: taskRect,
        originTaskMark: taskRect,
        conf: this.conf,
      })

      let taskMark: Mark
      if (appearanceInfo) {
        taskMark = appearanceInfo.taskMark
        barWidth = appearanceInfo.width
        barEndX = barStartX + barWidth
      } else {
        taskMark = taskRect
      }

      let textX: number
      const taskMarkOffset = appearanceInfo?.taskMarkOffset || { x: 0, y: 0 }
      const textWidth = calculateTextDimensions(task.label, this.fontConfig).width
      if (textWidth > barWidth) {
        const distanceToRightEdge = w - barEndX - taskMarkOffset.x // distance between bar end to diagram right edge
        if (textWidth < distanceToRightEdge) {
          textX = barEndX + textWidth / 2 + gridLineWidth + taskMarkOffset.x
        } else {
          textX = barStartX - textWidth / 2 + taskMarkOffset.x
        }
      } else {
        textX = barStartX + barWidth / 2 + taskMarkOffset.x
      }

      const textY = i * sectionUnitHeight + conf.barHeight / 2 + yStart
      // console.log('textX Y ', task.label, textX, textY)

      const textMark = makeMark('text', {
        text: task.label,
        x: textX + gridLineWidth / 2,
        y: textY,
        textAlign: 'center',
        textBaseline: 'middle',
        ...this.fontConfig,
        fill: conf.fontColor,
      })

      sectionGroup.children.push(taskMark, textMark)
    })

    // center section label mark vertically
    for (const { taskCount, labelMark, backgroundRect } of sectionsMap.values()) {
      if (taskCount > 1) {
        if (labelMark) labelMark.attrs.y += ((taskCount - 1) * sectionUnitHeight) / 2
        backgroundRect.attrs.height += (taskCount - 1) * sectionUnitHeight
      }
    }

    const sectionsHeight = Array.from(sectionsMap.values()).reduce((acc, o) => {
      return acc + o.taskCount * sectionUnitHeight
    }, 0)

    // TODO: links
    // const links = ganttDb.getLinks()

    return { sectionsHeight }
  }

  protected drawExcludeDays(opts: { sectionsHeight: number }) {
    const { conf } = this
    const excludesBackgrounGroup = makeEmptyGroup()
    const { gridLineStartPadding, gridLineColor, sidePadding, topPadding } = conf
    const yStart = topPadding + (this.titleTextDims.height || 0)

    this.layerManager.addMark('excludesBackground', excludesBackgrounGroup)

    const minTime = this.startDate
    const maxTime = this.endDate
    const { excludes, includes, dateFormat } = this.ir.attrs
    if (!minTime || !maxTime) return

    const taskXOffset = this.sectionLabelWidth + sidePadding
    const height = opts.sectionsHeight + gridLineStartPadding

    type Range = { start: Date; end: Date }
    const excludeRanges: Range[] = []
    let range: Range = null
    let d = dayjs(minTime)
    while (d.toDate() <= maxTime) {
      if (isInvalidDate(d, dateFormat, excludes, includes)) {
        if (!range) {
          range = {
            start: d.toDate(),
            end: d.toDate(),
          }
        }
      } else {
        if (range) {
          range.end = d.toDate()
          excludeRanges.push(range)
          range = null
        }
      }
      d = d.add(1, 'd')
    }

    excludeRanges.forEach(range => {
      const x = taskXOffset + this.getScaledTimeX(range.start)
      const endX = taskXOffset + this.getScaledTimeX(range.end)
      const rect = makeMark('rect', {
        x,
        width: endX - x,
        y: yStart,
        height,
        fill: gridLineColor,
        fillOpacity: 0.2,
      })
      excludesBackgrounGroup.children.push(rect)
    })
  }

  protected drawMarkDates(opts: { sectionsHeight: number }) {
    const { topPadding, sidePadding, gridLineStartPadding, markLineColor } = this.conf
    const titleHeight = this.titleTextDims.height || 0
    const yStart = topPadding + titleHeight
    const yEnd = yStart + opts.sectionsHeight + gridLineStartPadding

    const markLineGroup = makeEmptyGroup()
    this.layerManager.addMark('markLine', markLineGroup)
    this.ir.markDates.forEach(date => {
      const x = this.getScaledTimeX(date) + sidePadding + this.sectionLabelWidth
      const lineMark = makeMark('line', {
        x1: x,
        x2: x,
        y1: yStart,
        y2: yEnd,
        lineWidth: 2,
        stroke: markLineColor,
      })
      markLineGroup.children.push(lineMark)
    })
  }
}

type AppearanceInfo = {
  taskMark: Mark
  width: number
  taskMarkOffset: Point
}

type AppearanceInfoOpts = {
  baseAttrs: Partial<MarkAttrs>
  task: Task
  originTaskMark: Mark
  taskMark: Mark
  conf: GanttConf
}

type TaskTagsInfo = {
  decorate(opts: AppearanceInfoOpts): Partial<AppearanceInfo>
}

const TASK_TAGS_INFO_MAP: Record<string, Partial<TaskTagsInfo>> = {
  MILESTONE: {
    decorate(opts) {
      const { taskMark, conf } = opts
      const curAttrs = taskMark.attrs
      const axisWidth = Math.min(20, conf.barHeight) // width in x axis direction
      const diamondSide = axisWidth / 2
      const centerX = curAttrs.x
      const centerY = curAttrs.y + curAttrs.height / 2

      const diamondMark = drawDiamondTo({ x: centerX, y: centerY }, diamondSide, curAttrs)

      return {
        taskMark: diamondMark,
        width: axisWidth,
        taskMarkOffset: { x: -axisWidth, y: 0 },
      }
    },
  },
  DONE: {
    decorate(opts) {
      const { taskMark } = opts
      safeAssign(taskMark.attrs, {
        fillOpacity: 0.6,
      })
      return {
        taskMark,
      }
    },
  },
  CRIT: {
    decorate(opts) {
      const { taskMark } = opts
      safeAssign(taskMark.attrs, {
        stroke: 'red',
      })
      return {
        taskMark,
      }
    },
  },
}

function getTaskAppearanceInfo(opts: AppearanceInfoOpts): AppearanceInfo {
  const task = opts.task
  if (!task.tags) return
  const info: AppearanceInfo = {
    taskMark: opts.taskMark,
    width: opts.taskMark.attrs.width,
    taskMarkOffset: { x: 0, y: 0 },
  }
  let currentTaskMark = opts.taskMark
  task.tags.forEach(tag => {
    const decorator = TASK_TAGS_INFO_MAP[tag]
    if (decorator) {
      if (decorator.decorate) {
        Object.assign(
          info,
          decorator.decorate({
            ...opts,
            taskMark: currentTaskMark,
          }),
        )
        if (info.taskMark) currentTaskMark = info.taskMark
      }
    }
  })
  info.taskMark = currentTaskMark
  return info
}

export default artist
