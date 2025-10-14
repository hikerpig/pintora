// @ts-check
import { parse } from '../parser'
import db from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'
import dayjs from 'dayjs'

function makeDayStr(s, format = 'YYYY-MM-DD') {
  return dayjs(s).format(format)
}

function prepareTaskForTest(t) {
  const out = { ...t }
  if (t.startTime) out.startTime = makeDayStr(t.startTime, db.attrs.dateFormat)
  if (t.endTime) out.endTime = makeDayStr(t.endTime, db.attrs.dateFormat)
  if (t.renderEndTime) out.renderEndTime = makeDayStr(t.renderEndTime, db.attrs.dateFormat)

  return out
}

describe('gantt parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('should parse attrs', () => {
    const example = stripStartEmptyLines(`
    gantt
      title Gantt: to visualize agenda
      dateFormat YYYY-MM-DD
      axisFormat DD-HH:mm
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.attrs).toMatchObject({
      title: 'Gantt: to visualize agenda',
      dateFormat: 'YYYY-MM-DD',
      axisFormat: 'DD-HH:mm',
    })
  })

  it('should parse tasks', () => {
    const example = stripStartEmptyLines(`
    gantt
    Write grammar rules : start, 2022-2-17, 2022-2-23
    Write artist : todo
    `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.tasks).toMatchObject({
      start: {
        label: 'Write grammar rules',
        id: 'start',
        isManualEndTime: true,
      },
      task2: {
        label: 'Write artist',
        id: 'task2',
        isManualEndTime: false,
      },
    })
    expect(Object.values(ir.tasks).map(t => prepareTaskForTest(t))).toMatchObject([
      {
        startTime: '2022-02-17',
        endTime: '2022-02-23',
      },
      {
        startTime: '2022-02-23',
        endTime: '2022-02-23',
      },
    ])
  })

  it('should parse tags', () => {
    const example = stripStartEmptyLines(`
    gantt
    A : ACTIVE  , 2022-02-23   , 2022-02-24
    B : DONE
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(Object.values(ir.tasks).map(t => prepareTaskForTest(t))).toMatchObject([
      {
        label: 'A',
        tags: ['ACTIVE'],
        startTime: '2022-02-23',
        endTime: '2022-02-24',
      },
      {
        label: 'B',
        tags: ['DONE'],
      },
    ])
  })

  it('should parse task relation with "after"', () => {
    const example = stripStartEmptyLines(`
    gantt
    A : t-a, 2022-2-17, 2022-2-23
    section second
    B : t-b, after t-a, 2d
    C : t-c, after t-b, 2w
    `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(Object.values(ir.tasks).map(o => o.section)).toMatchObject([undefined, 'second', 'second'])
    expect(Object.values(ir.tasks).map(t => prepareTaskForTest(t))).toMatchObject([
      {
        label: 'A',
        endTime: '2022-02-23',
      },
      {
        label: 'B',
        startTime: '2022-02-23',
        endTime: '2022-02-25',
      },
      {
        label: 'C',
        startTime: '2022-02-25',
        endTime: '2022-03-11',
      },
    ])
  })

  it('should parse markDate', () => {
    const example = stripStartEmptyLines(`
    gantt
    markDate 2022-02-18
    A : 2022-2-17, 2022-2-23
    `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.markDates.map(s => makeDayStr(s))).toMatchObject(['2022-02-18'])
  })

  it('should parse and handle excludes', () => {
    const example = stripStartEmptyLines(`
    gantt
    excludes weekends, 2022-03-28
    A : t-a, 2022-03-25, 5d
    `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(Object.values(ir.tasks).map(t => prepareTaskForTest(t))).toMatchObject([
      {
        label: 'A',
        renderEndTime: '2022-04-01',
      },
    ])
  })

  it('should be able to parse deferred id', () => {
    // issue #386
    const example = stripStartEmptyLines(`
gantt
  "C" : after t-a, 5d
  "A" : t-a, 2022-3-15, 5d
    `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    const tasks = Object.values(ir.tasks)
    const task1 = tasks.find(t => t.label === 'C')
    const task1Start = new Date(task1.startTime)
    const task1End = new Date(task1.endTime)
    expect(task1Start.getFullYear()).toBe(2022) // after A
    expect(task1End.getFullYear()).toBe(2022)
  })
})
