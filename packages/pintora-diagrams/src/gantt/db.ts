/* eslint-disable @typescript-eslint/no-empty-function */
import { BaseDiagramIR } from '../util/ir'
import { dayjs } from '../util/time'
// import { ConfigParam } from '../util/config'
import { BaseDb } from '../util/base-db'
import { logger, makeIdCounter } from '@pintora/core'
import { DateFormat } from './type'

// with all respect to https://mermaid-js.github.io/mermaid/#/gantt
// the syntax is a little different

export type Task = {
  id: string
  label: string
  startTime: Date
  renderEndTime: Date
  endTime: Date
  duration?: string
  isManualEndTime?: boolean
  tag?: string
  /** section name */
  section: string | undefined
  order: number
  prevTaskId?: string
}

type GanttAttrs = {
  title: string
  dateFormat: DateFormat
  axisFormat: DateFormat
  excludes: string[]
  includes: string[]
}

export type GanttIR = BaseDiagramIR & {
  tasks: Record<string, Task>
  attrs: GanttAttrs
  markDates: Date[]
}

type ActionPayloadMap = {
  addAttr: { key: string; value: unknown }
  addTask: {
    label: string
    extraValue: string
  }
  addSection: {
    label: string
  }
  markDate: {
    value: string
  }
}

type ActionPayload<T extends keyof ActionPayloadMap> = { type: T } & ActionPayloadMap[T]

export type Action = ActionPayload<keyof ActionPayloadMap>

type ActionHandler<D, T extends keyof ActionPayloadMap> = (this: D, action: ActionPayload<T>) => unknown

const AFTER_TASK_REGEXP = /^after\s+([\d\w- ]+)/

export const DEFAULT_TIME_FORMAT = 'YYYY-MM-DD'

// id, startDate, endDate
// id, startDate, length
// id, after x, endDate
// id, after x, length
// startDate, endDate
// startDate, length
// after x, endDate
// after x, length
// endDate
// length

type ParseTaskDataOpts = {
  prevTask?: Task
}
export class GanttDb extends BaseDb {
  tasks: Record<string, Task> = {}
  attrs: GanttAttrs = this.makeDefaultAttrs()
  taskCounter = makeIdCounter()
  tags: Record<string, boolean> = this.makeDefaultTags()
  currentSection?: string
  markDates: Date[] = []

  // The serial order of the task in the script
  protected lastTaskId: string
  protected lastOrder = 0

  ACTION_HANDLERS: { [K in keyof ActionPayloadMap]: ActionHandler<GanttDb, K> } = {
    addAttr(action) {
      // console.log('add attr', action)
      let value = action.value
      if (['excludes', 'includes'].includes(action.type)) {
        value = (action.value as string).toLowerCase().split(/[\s,]+/)
      }
      this.attrs[action.key] = value
    },
    addTask(action) {
      this.addTask(action)
    },
    addSection(action) {
      this.currentSection = action.label
    },
    markDate(action) {
      this.processMarkDate(action.value)
    },
  }

  getDiagramIR(): GanttIR {
    return {
      ...super.getBaseDiagramIR(),
      tasks: this.tasks,
      attrs: this.attrs,
      markDates: this.markDates,
    }
  }

  apply(action: Action | Action[]) {
    if (!action) return
    if (Array.isArray(action)) {
      action.forEach(a => this.apply(a))
      return
    }
    if (action.type in this.ACTION_HANDLERS) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.ACTION_HANDLERS[action.type].call(this, action as any)
    }
    // else {
    //   console.warn(`no handler for action ${action.type}`)
    // }
  }

  makeTaskId(idStr?: string | undefined) {
    if (typeof idStr === 'undefined') {
      const taskCount = this.taskCounter.next()
      return 'task' + taskCount
    }
    return idStr
  }

  addTask(action: ActionPayloadMap['addTask']) {
    const { label, extraValue } = action

    const task = this.parseTaskData(label.trim(), extraValue.trim(), {})
    // console.log('add task', task)

    this.lastTaskId = task.id
    this.tasks[task.id] = task
  }

  // parse extra value to task attributes
  parseTaskData(label: string, dataStr: string, opts: ParseTaskDataOpts) {
    const prevTask = opts.prevTask || this.tasks[this.lastTaskId]
    const segs = dataStr
      .trim()
      .split(',')
      .map(str => str.trim())

    const task: Task = {
      label,
      id: this.makeTaskId(),
      startTime: null,
      endTime: null,
      renderEndTime: null,
      order: this.lastOrder++,
      section: this.currentSection,
    }

    // find match tag
    if (segs[0]) {
      const v = segs[0].toUpperCase()
      if (this.tags[v]) {
        task.tag = v
        segs.shift()
      }
    }

    const segsLen = segs.length
    let endTimeData = ''
    if (segsLen === 1) {
      const [end] = segs
      task.startTime = prevTask?.endTime
      endTimeData = end
    } else if (segsLen === 2) {
      const [start, end] = segs
      const { date, prevTaskId } = this.getStartOfTask(start)
      task.startTime = date
      task.prevTaskId = prevTaskId
      endTimeData = end
    } else if (segsLen === 3) {
      const [id, start, end] = segs
      task.id = this.makeTaskId(id)
      const { date, prevTaskId } = this.getStartOfTask(start)
      task.startTime = date
      task.prevTaskId = prevTaskId
      endTimeData = end
    }

    if (endTimeData) {
      task.endTime = this.getEndDate(task.startTime, endTimeData, false)
      task.isManualEndTime = isDateStrValid(endTimeData, this.attrs.dateFormat).isValid
      checkTaskDates(task, this.attrs.dateFormat, this.attrs.excludes, this.attrs.includes)
    }
    return task
  }

  protected findTaskById(id: string) {
    return this.tasks[id]
  }

  protected getStartOfTask(str: string) {
    str = str.trim()
    let prevTaskId = ''

    const afterStatement = AFTER_TASK_REGEXP.exec(str.trim())
    if (afterStatement !== null) {
      // check all after ids and take the latest
      let latestEndingTask: Task | null = null
      afterStatement[1].split(' ').forEach(id => {
        const task = this.findTaskById(id)
        if (typeof task !== 'undefined') {
          prevTaskId = task.id
          if (!latestEndingTask) {
            latestEndingTask = task
          } else {
            if (task.endTime > latestEndingTask.endTime) {
              latestEndingTask = task
            }
          }
        }
      })

      if (!latestEndingTask) {
        const dt = new Date()
        dt.setHours(0, 0, 0, 0)
        return { date: dt, prevTaskId }
      } else {
        return { date: latestEndingTask.endTime, prevTaskId }
      }
    }

    const dateFormat = this.attrs.dateFormat
    // Check for actual date set
    const mDate = dayjs(str, dateFormat, true)
    if (mDate.isValid()) {
      return { date: mDate.toDate(), prevTaskId }
    } else {
      logger.debug(`Invalid date: ${str}, dateFormat: ${dateFormat}`)
    }

    return { date: new Date(), prevTaskId }
  }

  protected getEndDate(prevTime: Date | undefined, str: string, inclusive: boolean) {
    inclusive = inclusive || false
    str = str.trim()

    // Check for actual date
    const mDate = dayjs(str, this.attrs.dateFormat.trim(), true)
    if (mDate.isValid()) {
      if (inclusive) {
        mDate.add(1, 'd')
      }
      return mDate.toDate()
    }
    return durationToDate(/^([\d]+)([wdhms])/.exec(str.trim()), dayjs(prevTime))
  }

  protected processMarkDate(str: string) {
    const trimmedStr = str.trim()
    let date: Date
    if (trimmedStr === 'today') {
      date = new Date()
    } else {
      const { dayObject, isValid } = isDateStrValid(str, this.attrs.dateFormat)
      if (isValid) {
        date = dayObject.toDate()
      }
    }
    if (date) {
      this.markDates.push(date)
    }
  }

  protected makeDefaultAttrs(): GanttAttrs {
    return {
      title: '',
      dateFormat: DEFAULT_TIME_FORMAT,
      axisFormat: '',
      excludes: [],
      includes: [],
    }
  }

  protected makeDefaultTags() {
    return createDictByKeys(['ACTIVE', 'DONE', 'CRIT', 'MILESTONE'])
  }

  override clear() {
    super.clear()
    this.tasks = {}
    this.attrs = this.makeDefaultAttrs()
    this.tags = this.makeDefaultTags()
    this.lastOrder = 0
    this.currentSection = undefined
    this.markDates = []
  }
}

const db = new GanttDb()

// start - utils
function isDateStrValid(str: string, timeFormat?: DateFormat) {
  const dayObject = dayjs(str, timeFormat || DEFAULT_TIME_FORMAT, true)
  return { dayObject, isValid: dayObject.isValid() }
}

function checkTaskDates(task: Task, dateFormat: string, excludes, includes) {
  if (!excludes.length || task.isManualEndTime) return
  const startTime = dayjs(task.startTime, dateFormat, true)
  startTime.add(1, 'd')
  const endTime = dayjs(task.endTime, dateFormat, true)
  const renderEndTime = fixTaskDates(startTime, endTime, dateFormat, excludes, includes)
  task.endTime = endTime.toDate()
  task.renderEndTime = renderEndTime
}

const fixTaskDates = function (
  startTime: dayjs.Dayjs,
  endTime: dayjs.Dayjs,
  dateFormat: string,
  excludes: string | string[],
  includes: string | string[],
) {
  let invalid = false
  let renderEndTime = null
  while (startTime <= endTime) {
    if (!invalid) {
      renderEndTime = endTime.toDate()
    }
    invalid = isInvalidDate(startTime, dateFormat, excludes, includes)
    // console.log('invalid', startTime)
    if (invalid) {
      endTime = endTime.add(1, 'd')
    }
    startTime = startTime.add(1, 'd')
  }
  return renderEndTime
}

export const isInvalidDate = function (
  date: dayjs.Dayjs,
  dateFormat: string,
  excludes: string | string[],
  includes: string | string[],
) {
  if (includes.length && includes.indexOf(date.format(dateFormat)) >= 0) {
    return false
  }

  if (date.day() >= 6 && excludes.indexOf('weekends') >= 0) {
    return true
  }
  if (excludes.length && excludes.indexOf(date.format('dddd').toLowerCase()) >= 0) {
    return true
  }
  return excludes.indexOf(date.format(dateFormat.trim())) >= 0
}

const durationToDate = function (durationStatement: string[], relativeTime: dayjs.Dayjs) {
  let resultDate = relativeTime
  if (durationStatement !== null) {
    const [_, numStr, unit] = durationStatement
    const num = parseFloat(numStr)
    switch (unit) {
      case 's':
        resultDate = relativeTime.add(num, 'second')
        break
      case 'm':
        resultDate = relativeTime.add(num, 'minute')
        break
      case 'h':
        resultDate = relativeTime.add(num, 'hour')
        break
      case 'd':
        resultDate = relativeTime.add(num, 'day')
        break
      case 'w':
        resultDate = relativeTime.add(num, 'week')
        break
    }
  }
  // Default date - now
  return resultDate.toDate()
}

function createDictByKeys<K extends string>(keys: K[], defaultValue = true) {
  return keys.reduce((acc, current) => {
    acc[current] = defaultValue
    return acc
  }, {} as Record<K, boolean>)
}
// end - utils

export default db
