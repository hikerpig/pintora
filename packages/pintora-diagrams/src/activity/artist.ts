import {
  GraphicsIR,
  IDiagramArtist,
  Group,
  safeAssign,
  Rect,
  Text,
  calculateTextDimensions,
  getPointAt,
  PathCommand,
  TSize,
  Mark,
  configApi,
  last,
} from '@pintora/core'
import { Action, ActivityDiagramIR, AGroup, Condition, Keyword, Note, Step, Switch, Case, While } from './db'
import { ActivityConf, getConf } from './config'
import { adjustEntities, createLayoutGraph, getGraphBounds, LayoutEdge, LayoutGraph, LayoutNode } from '../util/graph'
import {
  makeMark,
  calcDirection,
  makeLabelBg,
  drawArrowTo,
  makeEmptyGroup,
  adjustRootMarkBounds,
  getBaseNote,
} from '../util/artist-util'
import dagre from '@pintora/dagre'
import { positionGroupContents } from '../util/mark-positioner'
import { ITheme } from '../util/themes/base'
import { DiagramsConf } from '../type'

let conf: ActivityConf
let model: ArtistModel
let activityDraw: ActivityDraw
let theme: ITheme

const erArtist: IDiagramArtist<ActivityDiagramIR, ActivityConf> = {
  draw(ir) {
    conf = getConf([])
    model = new ArtistModel(ir)
    theme = (configApi.getConfig() as DiagramsConf).themeConfig.themeVariables
    // console.log('ir', JSON.stringify(ir, null, 2))

    const rootMark: Group = {
      type: 'group',
      children: [],
    }

    const g = createLayoutGraph({
      multigraph: true,
      directed: true,
      compound: true,
    })
      .setGraph({
        rankdir: conf.layoutDirection,
        nodesep: 60,
        edgesep: 60,
        ranksep: 30,
      })
      .setDefaultEdgeLabel(function () {
        return {}
      })

    model.preProcess()
    activityDraw = new ActivityDraw(model, g)
    // ;(window as any).activityDraw = activityDraw

    ir.steps.forEach(step => {
      activityDraw.drawStep(rootMark, step)
    })
    ir.notes.forEach(note => {
      activityDraw.drawNote(rootMark, note)
    })

    dagre.layout(g)

    adjustEntities(g)

    drawEdges(rootMark, g)

    const bounds = getGraphBounds(g)

    // console.log('bounds', bounds)
    const { width, height } = adjustRootMarkBounds(rootMark, bounds, conf.diagramPadding, conf.diagramPadding)

    return {
      mark: rootMark,
      width,
      height,
    } as GraphicsIR
  },
}

type StepModel = {
  id: string
  startId?: string
  endId?: string
  type: Step['type']
  value: Step['value']
  prevId?: string // id or previous stepModel
  parentId?: string
  width: number
  height: number
}

type NoteModel = {
  width: number
  height: number
  startx: number
  stopx: number
  starty: number
  stopy: number
  text: string
}

function getActionRectSize(text: string) {
  const textDims = calculateTextDimensions(text)
  const rectWidth = textDims.width + conf.actionPaddingX * 2
  const rectHeight = textDims.height + conf.actionPaddingY * 2
  return { rectWidth, rectHeight }
}

class ArtistModel {
  constructor(public ir: ActivityDiagramIR) {}

  stepModelMap = new Map<string, StepModel>()
  stepNotesMap = new Map<string, Note[]>()

  private shouldTouchPrevIds(step: Step) {
    return step.type !== 'group'
  }

  preProcess() {
    const { ir } = this
    let prevIds: string[] = []

    const processRecursiveStep = (
      step: Step,
      stepModel: StepModel,
      opts: { childrenKeys?: string[]; parallelChildren?: boolean } = {},
    ) => {
      const { childrenKeys = ['children'], parallelChildren = false } = opts
      const value = step.value
      const shouldSetPrevId = this.shouldTouchPrevIds(step)
      if (shouldSetPrevId) stepModel.prevId = last(prevIds)
      const oldPrevIds = prevIds
      if (shouldSetPrevId) {
        prevIds = []
      }
      const endId = `${value.id}-end`
      safeAssign(stepModel, {
        endId,
      })
      childrenKeys.forEach(key => {
        if (value[key]) {
          value[key].forEach(s => {
            processStep(s)
            if (parallelChildren) {
              prevIds = []
            }
          })
        }
      })
      this.stepModelMap.set(value.id, stepModel)
      prevIds = oldPrevIds
    }

    const processStep = (step: Step) => {
      let stepModel: StepModel
      stepModel = this.makeStepModel(step)
      switch (step.type) {
        case 'action': {
          const action = step.value as Action
          const { rectWidth, rectHeight } = getActionRectSize(action.message)
          safeAssign(stepModel, {
            width: rectWidth,
            height: rectHeight,
          })

          this.stepModelMap.set(action.id, stepModel)
          break
        }
        case 'condition': {
          const condition = step.value as Condition
          stepModel.prevId = last(prevIds)
          const oldPrevIds = prevIds
          prevIds = []
          condition.then.children.forEach(s => processStep(s))
          if (condition.else) {
            prevIds = []
            condition.else.children.forEach(s => processStep(s))
          }
          const endId = `${condition.id}-end`
          safeAssign(stepModel, {
            endId,
          })
          this.stepModelMap.set(condition.id, stepModel)
          prevIds = oldPrevIds
          break
        }
        case 'while': {
          processRecursiveStep(step, stepModel)
          break
        }
        case 'switch': {
          processRecursiveStep(step, stepModel, { parallelChildren: true })
          break
        }
        case 'case': {
          processRecursiveStep(step, stepModel)
          const value = step.value as Case
          const firstChild = value.children[0]
          const lastChild = last(value.children)
          safeAssign(stepModel, {
            startId: firstChild ? firstChild.value.id : value.id,
            endId: lastChild ? lastChild.value.id : value.id,
          })
          break
        }
        case 'group': {
          processRecursiveStep(step, stepModel)
          const aGroup = step.value as AGroup
          if (aGroup.children.length) {
            const firstChild = aGroup.children[0]
            const lastChild = last(aGroup.children)
            safeAssign(stepModel, {
              startId: firstChild.value.id,
              endId: lastChild.value.id,
            })
          }
          break
        }
        case 'keyword': {
          const keyword = step.value as Keyword
          const { rectWidth, rectHeight } = getActionRectSize(keyword.label)
          safeAssign(stepModel, {
            width: rectWidth,
            height: rectHeight,
          })
          this.stepModelMap.set(keyword.id, stepModel)
          break
        }
        default: {
          stepModel = null
        }
      }

      if (prevIds.length && stepModel && !stepModel.prevId) {
        if (step.type !== 'group') {
          const validPrevId = last(prevIds)
          const lastStepModel = this.stepModelMap.get(validPrevId)
          stepModel.prevId = lastStepModel ? lastStepModel.endId || lastStepModel.id : validPrevId
          // console.log('prevId of', stepModel.id, 'is', stepModel.prevId)
        }
      }
      let newPrevId: string
      if (stepModel && this.shouldTouchPrevIds(step)) {
        if (stepModel.endId) {
          newPrevId = stepModel.endId
        } else if ('startId' in stepModel) {
          newPrevId = stepModel.startId
        } else if ('id' in step.value) {
          newPrevId = step.value.id
        }
      }

      if (newPrevId) {
        prevIds.pop()
        prevIds.push(newPrevId)
      }
    }

    ir.steps.forEach(step => {
      processStep(step)
    })
    ir.notes.forEach(note => {
      const parentId = note.target
      if (parentId && this.stepModelMap.has(parentId)) {
        let stepNotes: Note[] = this.stepNotesMap.get(parentId)
        if (!stepNotes) {
          stepNotes = []
          this.stepNotesMap.set(parentId, stepNotes)
        }
        stepNotes.push(note)
      }
    })
  }

  protected makeStepModel(step: Step): StepModel {
    return {
      ...step,
      id: (step.value as any).id,
      width: 0,
      height: 0,
    }
  }
}

type DrawStepResult = {
  id: string
  endId?: string
  startMark: Group
  stepModel?: StepModel
}

class ActivityDraw {
  private keywordStepResults: { [key: string]: DrawStepResult } = {}

  constructor(public model: ArtistModel, public g: LayoutGraph) {}

  drawStep(rootMark: Group, step: Step): DrawStepResult | null {
    const g = this.g
    let result: DrawStepResult
    switch (step.type) {
      case 'action': {
        result = drawAction(rootMark, step.value as Action, g)
        break
      }
      case 'condition': {
        const condition = step.value as Condition
        result = this.drawCondition(rootMark, condition)
        break
      }
      case 'while': {
        result = this.drawWhile(rootMark, step.value as While)
        break
      }
      case 'switch': {
        result = this.drawSwitch(rootMark, step.value as Switch)
        break
      }
      case 'case': {
        result = this.drawCase(rootMark, step.value as Case)
        break
      }
      case 'group': {
        result = this.drawGroup(rootMark, step.value as AGroup)
        break
      }
      case 'keyword': {
        const keyword = step.value as Keyword
        result = this.drawKeyword(rootMark, keyword)
        this.keywordStepResults[keyword.label] = result
        break
      }
      default:
        break
    }

    if (result && result.stepModel) {
      const prevId = result.stepModel.prevId
      const startIdOfCurrent = result.stepModel.startId || result.stepModel.id
      if (prevId && prevId === this.keywordStepResults.start?.id) {
        g.setEdge(prevId, startIdOfCurrent, { label: '' })
      } else if (result === this.keywordStepResults.end) {
        g.setEdge(prevId, startIdOfCurrent, { label: '' })
      } else if (prevId) {
        g.setEdge(prevId, startIdOfCurrent, { label: '' })
      }
    }

    return result
      ? {
          ...result,
        }
      : null
  }

  private linkResult(start: DrawStepResult | string, end: DrawStepResult, label = '') {
    if (!(start && end)) return
    const startId = typeof start === 'string' ? start : start.endId || start.id
    this.g.setEdge(startId, end.id, { label })
  }

  drawCondition(parentMark: Group, condition: Condition): DrawStepResult {
    // console.log('[drawCondition] condition', condition)
    const group = makeMark(
      'group',
      {
        x: 0,
        y: 0,
      },
      { children: [] },
    )
    const stepModel = model.stepModelMap.get(condition.id)

    const { bgMark: decisionBg, textMark, rectWidth, rectHeight } = this.drawDecisionMarks(condition.message)

    this.g.setNode(condition.id, {
      id: condition.id,
      mark: group,
      width: rectWidth,
      height: rectHeight,
      onLayout(data) {
        positionGroupContents(group, { ...data, x: data.x - data.width / 2, y: data.y - data.height / 2 })
      },
    })

    const id = condition.id
    const endId = stepModel.endId
    const result: DrawStepResult = {
      id,
      startMark: group,
      stepModel,
      endId,
    }

    const { mark: diamondMark } = this.drawDiamondMark(endId)

    parentMark.children.push(group, diamondMark)
    group.children.push(decisionBg, textMark)

    const lastThenChildResult = last(
      condition.then.children.map((s, i) => {
        const childResult = this.drawStep(parentMark, s)
        if (i === 0) {
          this.linkResult(id, childResult, 'yes')
        }
        return childResult
      }),
    )
    if (lastThenChildResult) this.g.setEdge(lastThenChildResult.endId || lastThenChildResult.id, endId, { label: '' })

    if (condition.else) {
      const lastElseChildResult = last(
        condition.else.children.map((s, i) => {
          const childResult = this.drawStep(parentMark, s)
          if (i === 0) {
            this.linkResult(id, childResult, 'no')
          }
          return childResult
        }),
      )
      if (lastElseChildResult) this.g.setEdge(lastElseChildResult.endId || lastElseChildResult.id, endId, { label: '' })
    }

    return result
  }

  private drawDecisionMarks(message: string) {
    const { rectWidth, rectHeight } = getActionRectSize(message)
    const side = Math.ceil(conf.fontSize * 0.8)
    const decisionBg = makeMark(
      'path',
      {
        fill: conf.actionBackground,
        stroke: conf.actionBorderColor,
        path: [
          ['m', 0, rectHeight / 2],
          ['l', side, rectHeight / 2],
          ['l', rectWidth - side * 2, 0],
          ['l', side, -rectHeight / 2],
          ['l', -side, -rectHeight / 2],
          ['l', -rectWidth + side * 2, 0],
          ['Z'],
        ],
      },
      { class: 'activity__decision-bg' },
    )

    const textDims = calculateTextDimensions(message)

    const textMark = makeTextMark(message, textDims, {
      y: rectHeight / 2,
      x: rectWidth / 2,
      fontSize: conf.fontSize,
      textBaseline: 'middle',
      textAlign: 'center',
    })

    return {
      bgMark: decisionBg,
      textMark,
      rectWidth,
      rectHeight,
    }
  }

  private drawDiamondMark(id: string, attrs: Partial<Mark['attrs']> = {}, opts: { class?: string } = {}) {
    const diamondSide = 10
    const diamondMark = makeMark(
      'path',
      {
        width: 20,
        height: 20,
        path: [
          ['m', -diamondSide, 0],
          ['l', diamondSide, diamondSide],
          ['l', diamondSide, -diamondSide],
          ['l', -diamondSide, -diamondSide],
          ['Z'],
        ],
        fill: conf.actionBackground,
        stroke: conf.actionBorderColor,
        ...attrs,
      },
      { class: opts.class || 'activity__condition-end' },
    )

    this.g.setNode(id, {
      id: id,
      mark: diamondMark,
      width: diamondSide * 2,
      height: diamondSide * 2,
      onLayout(data) {
        // for some strange reason, we can't specify two move commands at the first of the path,
        // otherwise the path will be invalid in canvas output, may be a 'g-canvas' bug or something else.
        // here is a trick to make the path commands valid and diamond centered.
        const firstCommand = (diamondMark.attrs.path as PathCommand[])[0]
        firstCommand[1] = data.x - diamondSide
        firstCommand[2] = data.y
      },
    })

    return {
      mark: diamondMark,
    }
  }

  drawWhile(parentMark: Group, wh: While): DrawStepResult {
    const { message, id } = wh
    const group = makeMark(
      'group',
      {
        x: 0,
        y: 0,
      },
      { children: [] },
    )
    const stepModel = model.stepModelMap.get(wh.id)

    const { bgMark: decisionBg, textMark, rectWidth, rectHeight } = this.drawDecisionMarks(message)

    this.g.setNode(id, {
      id: id,
      mark: group,
      width: rectWidth,
      height: rectHeight,
      onLayout(data) {
        positionGroupContents(group, { ...data, x: data.x - data.width / 2, y: data.y - data.height / 2 })
      },
    })

    const endId = stepModel.endId
    const result: DrawStepResult = {
      id,
      startMark: group,
      stepModel,
      endId,
    }

    const { mark: diamondMark } = this.drawDiamondMark(endId, {}, { class: 'activity__while-end' })

    parentMark.children.push(group, diamondMark)
    group.children.push(decisionBg, textMark)

    const lastChildResult = last(
      wh.children.map((s, i) => {
        const childResult = this.drawStep(parentMark, s)
        if (i === 0) {
          this.linkResult(id, childResult, wh.confirmLabel || '')
        }
        return childResult
      }),
    )
    if (lastChildResult) this.g.setEdge(lastChildResult.endId || lastChildResult.id, id, { label: '' })
    this.g.setEdge(id, endId, { label: wh.denyLabel || '' }) // to end mark

    return result
  }

  drawGroup(parentMark: Group, aGroup: AGroup): DrawStepResult {
    const { id } = aGroup
    const group = makeMark(
      'group',
      {
        x: 0,
        y: 0,
      },
      { children: [] },
    )

    const stepModel = model.stepModelMap.get(id)

    const endId = stepModel.endId
    const result: DrawStepResult = {
      id,
      startMark: group,
      stepModel,
      endId,
    }

    const bgMark = makeMark(
      'rect',
      {
        fill: aGroup.background || conf.groupBackground,
        stroke: conf.groupBorderColor,
        lineWidth: 2,
        radius: 2,
      },
      { class: 'activity__group-rect' },
    )

    const groupLabel = aGroup.label || aGroup.name

    const labelMark = makeMark(
      'text',
      {
        text: groupLabel,
        fill: conf.textColor,
        fontWeight: 'bold',
        fontSize: conf.fontSize,
      },
      { class: 'component__group-rect' },
    )
    const labelTextDims = calculateTextDimensions(groupLabel)

    this.g.setNode(id, {
      id,
      onLayout(data: LayoutNode) {
        const { x, y, width, height } = data
        const containerWidth = Math.max(width, labelTextDims.width + 10)
        safeAssign(bgMark.attrs, { x: x - containerWidth / 2, y: y - height / 2, width: containerWidth, height })

        safeAssign(labelMark.attrs, { x: x - containerWidth / 2 + 5, y: y - height / 2 + labelTextDims.height + 8 })
      },
    })

    group.children.push(bgMark, labelMark)
    parentMark.children.push(group)

    aGroup.children.map((s, i) => {
      const childResult = this.drawStep(parentMark, s)
      this.g.setParent(childResult.id, id)
      return childResult
    })

    return result
  }

  drawSwitch(parentMark: Group, s: Switch): DrawStepResult {
    const { id, message } = s
    const group = makeEmptyGroup()
    const stepModel = model.stepModelMap.get(id)

    const { bgMark: decisionBg, textMark, rectWidth, rectHeight } = this.drawDecisionMarks(message)

    this.g.setNode(id, {
      id: id,
      mark: group,
      width: rectWidth,
      height: rectHeight,
      onLayout(data) {
        positionGroupContents(group, { ...data, x: data.x - data.width / 2, y: data.y - data.height / 2 })
      },
    })

    const endId = stepModel.endId
    const result: DrawStepResult = {
      id,
      startMark: group,
      stepModel,
      endId,
    }

    const { mark: diamondMark } = this.drawDiamondMark(endId)

    group.children.push(decisionBg, textMark)
    parentMark.children.push(group, diamondMark)

    s.children.map((caseStep: Step<Case>, i) => {
      const childResult = this.drawStep(parentMark, caseStep)
      // console.log('[drawSwitch]childResult', childResult)
      this.g.setEdge(id, childResult.stepModel.startId || childResult.id, {
        label: caseStep.value.confirmLabel,
        simplifyStartEdge: true,
      } as EdgeData)
      this.g.setEdge(childResult.endId, endId, { label: '' })
      return childResult
    })

    return result
  }

  drawCase(parentMark: Group, c: Case): DrawStepResult {
    const { id } = c
    const group = makeEmptyGroup()
    const stepModel = model.stepModelMap.get(id)

    const endId = stepModel.endId
    const result: DrawStepResult = {
      id,
      startMark: group,
      stepModel,
      endId,
    }

    parentMark.children.push(group)

    if (c.children.length) {
      c.children.map((caseClause, i) => {
        const childResult = this.drawStep(parentMark, caseClause)
        return childResult
      })
    } else {
      const holderMark = makeMark('circle', {
        x: 0,
        y: 0,
        r: 1,
      })
      parentMark.children.push(holderMark)
      this.g.setNode(endId, {
        width: 1,
        height: 1,
        mark: holderMark,
      })
    }

    return result
  }

  drawKeyword(parentMark: Group, keyword: Keyword): DrawStepResult {
    const stepModel = model.stepModelMap.get(keyword.id)
    const group = makeEmptyGroup()
    const { label, id } = keyword
    const r = 10
    const stroke = conf.keywordBgColor
    const fill = conf.keywordBgColor
    if (label === 'start') {
      const bgMark = makeMark('circle', {
        r,
        x: 0,
        y: 0,
        fill,
      })
      group.children.push(bgMark)
    } else if (label === 'stop' || label === 'end') {
      const bgMark = makeMark('circle', {
        r,
        x: 0,
        y: 0,
        stroke,
      })
      const centerCircle = makeMark('circle', {
        r: r * 0.6,
        x: 0,
        y: 0,
        fill,
      })
      group.children.push(bgMark, centerCircle)
    }
    parentMark.children.push(group)

    this.g.setNode(id, {
      id,
      mark: group,
      width: r * 2,
      height: r * 2,
      onLayout(data) {
        positionGroupContents(group, { ...data, x: data.x, y: data.y })
      },
    })
    const result = {
      id,
      startMark: group,
      stepModel,
    }
    return result
  }

  drawNote(parentMark: Group, note: Note) {
    const { id, text } = note

    const group = makeMark(
      'group',
      {
        x: 0,
        y: 0,
      },
      { children: [], class: 'activity__note' },
    )
    parentMark.children.push(group)

    const textDims = calculateTextDimensions(text, { fontSize: conf.fontSize })
    const rectAttrs = getBaseNote(theme)
    const noteModel = {
      width: textDims.width + 2 * conf.noteMargin,
      height: textDims.height + 2 * conf.noteMargin,
    }
    const noteRect: Rect = {
      type: 'rect',
      class: 'note__bg',
      attrs: rectAttrs,
    }

    const textMark: Text = {
      type: 'text',
      attrs: { fill: conf.noteTextColor, text, textBaseline: 'alphabetic' },
    }

    const targetStepModel = this.model.stepModelMap.get(note.target)
    if (targetStepModel) {
      if (targetStepModel.parentId) {
        this.g.setParent(targetStepModel.parentId, id)
      }
    }

    this.g.setNode(id, {
      mark: group,
      width: noteModel.width,
      height: noteModel.height,
      onLayout: (data: LayoutNode) => {
        const targetNodeData = this.g.node(targetStepModel.id) as LayoutNode
        let x
        if (note.placement === 'left') {
          x = targetNodeData.x - targetNodeData.width / 2 - noteModel.width - conf.noteMargin
        } else {
          x = targetNodeData.x + targetNodeData.width / 2 + conf.noteMargin
        }
        const y = targetNodeData.y - targetNodeData.height / 2

        safeAssign(textMark.attrs, {
          x: x + conf.noteMargin,
          y: y + textDims.height + conf.noteMargin,
          width: noteModel.width,
        })

        safeAssign(rectAttrs, {
          x,
          y,
          width: noteModel.width,
          height: noteModel.height,
        })
      },
    })
    group.children.push(noteRect, textMark)
  }
}

function drawAction(parentMark: Group, action: Action, g: LayoutGraph): DrawStepResult {
  const stepModel = model.stepModelMap.get(action.id)
  const group = makeMark(
    'group',
    {
      x: 0,
      y: 0,
    },
    { children: [] },
  )
  const textDims = calculateTextDimensions(action.message)
  const rectWidth = stepModel.width
  const rectHeight = stepModel.height
  const rectMark = makeMark('rect', {
    width: rectWidth,
    height: rectHeight,
    x: 0,
    y: 0,
    fill: conf.actionBackground,
    stroke: conf.actionBorderColor,
  })
  const textMark = makeTextMark(action.message, textDims, {
    y: rectHeight / 2,
    x: rectWidth / 2,
    fontSize: conf.fontSize,
    textBaseline: 'middle',
    textAlign: 'center',
  })

  group.children.push(rectMark, textMark)

  g.setNode(action.id, {
    id: action.id,
    mark: group,
    width: rectWidth,
    height: rectHeight,
    onLayout(data) {
      // console.log('[drawAction] onLayout', data)
      positionGroupContents(group, { ...data, x: data.x - data.width / 2, y: data.y - data.height / 2 })
    },
  })

  parentMark.children.push(group)

  return {
    id: action.id,
    startMark: group,
    stepModel,
  }
}

type EdgeData = LayoutEdge<{
  label?: string
  simplifyStartEdge?: boolean
}>

function drawEdges(parent: Group, g: LayoutGraph) {
  const edgeGroup = makeMark('group', {}, { children: [] })
  g.edges().forEach(e => {
    const edge: EdgeData = g.edge(e)
    if (!edge.points) return
    const [startPoint, ...restPoints] = edge.points
    const lastPoint = restPoints[restPoints.length - 1]
    // if (edge.simplifyStartEdge) {
    //   const secondPoint = restPoints[0]
    //   safeAssign(secondPoint, {
    //     y: startPoint.y,
    //   })
    // }

    const linePath = makeMark('path', {
      path: [
        ['M', startPoint.x, startPoint.y],
        ...restPoints.map(point => {
          return ['L', point.x, point.y] as any
        }),
      ],
      stroke: conf.edgeColor,
      lineJoin: 'round',
    })
    const pointsForDirection = restPoints.slice(-2)
    const arrowRad = calcDirection.apply(null, pointsForDirection)
    const arrowMark = drawArrowTo(lastPoint, 8, arrowRad, {
      color: conf.edgeColor,
    })

    // Find the half-way point
    const labelPoint = getPointAt(edge.points, 0.4, true)
    if (!labelPoint) return
    const labelX = labelPoint.x
    const labelY = labelPoint.y
    // if (edge.simplifyStartEdge) {
    //   labelY = (startPoint.y + lastPoint.y) / 2
    // }

    const labelDims = calculateTextDimensions(edge.label || '')
    const labelBgMark = makeLabelBg(labelDims, { x: labelX, y: labelY })
    const labelMark = makeMark(
      'text',
      {
        text: edge.label,
        id: [e.v, e.w].join('-'),
        textAlign: 'center',
        textBaseline: 'middle',
        x: labelX,
        y: labelY,
        fill: conf.textColor,
        fontSize: conf.fontSize,
      },
      { class: 'activity__edge-label' },
    )

    edgeGroup.children.push(linePath, labelBgMark, labelMark, arrowMark)
  })
  parent.children.push(edgeGroup)
}

/**
 * Based on action text config
 */
function makeTextMark(text: string, textDims: TSize, attrs: Partial<Text['attrs']>) {
  return makeMark('text', {
    text,
    width: textDims.width,
    height: textDims.height,
    fill: conf.textColor,
    fontSize: conf.fontSize,
    textBaseline: 'middle',
    textAlign: 'center',
    ...attrs,
  })
}

export default erArtist
