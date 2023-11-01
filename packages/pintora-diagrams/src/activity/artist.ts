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
  Mark,
  configApi,
  last,
  PintoraConfig,
  ITheme,
  unique,
  compact,
  Bounds,
  IFont,
  TSize,
  Maybe,
} from '@pintora/core'
import {
  Action,
  ActivityDiagramIR,
  AGroup,
  Condition,
  Keyword,
  Note,
  Step,
  Switch,
  Case,
  While,
  ArrowLabel,
  Fork,
  ForkBranch,
  Repeat,
} from './db'
import { ActivityConf, getConf } from './config'
import { createLayoutGraph, getGraphSplinesOption, LayoutEdge, LayoutGraph, LayoutNode } from '../util/graph'
import {
  makeMark,
  calcDirection,
  makeLabelBg,
  drawArrowTo,
  makeEmptyGroup,
  adjustRootMarkBounds,
  getBaseNote,
  makeCircle,
} from '../util/artist-util'
import { makeBounds, positionGroupContents, tryExpandBounds } from '../util/mark-positioner'
import { isDev } from '../util/env'
import { getPointsCurvePath, getPointsLinearPath } from '../util/line-util'
import { makeTextMark } from './artist-util'
import { calcBound, updateBoundsByPoints } from '../util/bound'
import { getTextDimensionsInPresicion } from '../util/text'
import { DagreWrapper } from '../util/dagre-wrapper'

let conf: ActivityConf
let model: ArtistModel
let activityDraw: ActivityDraw
let theme: ITheme

function calcTextDims(text: string, attrs: Partial<Text['attrs']> = {}) {
  const _attrs = Object.assign(getFontConfig(conf), attrs)
  return calculateTextDimensions(text, _attrs)
}

function isDetachAlikeKeyword(keyword: Keyword) {
  return ['detach', 'kill'].includes(keyword.label)
}

function isEndAlikeKeyword(keyword: Keyword) {
  return ['end', 'stop'].includes(keyword.label)
}

const erArtist: IDiagramArtist<ActivityDiagramIR, ActivityConf> = {
  draw(ir, config, opts?) {
    conf = getConf(ir, config)
    model = new ArtistModel(ir)
    theme = (configApi.getConfig() as PintoraConfig).themeConfig.themeVariables
    // console.log('ir', JSON.stringify(ir, null, 2))

    const rootMark: Group = makeEmptyGroup()

    const g = createLayoutGraph({
      multigraph: true,
      directed: true,
      compound: true,
    })
      .setGraph({
        rankdir: 'TB',
        nodesep: 60,
        edgesep: conf.edgesep,
        ranksep: 30,
        splines: getGraphSplinesOption(conf.edgeType),
      })
      .setDefaultEdgeLabel(function () {
        return {}
      })

    model.preProcess()
    const dagreWrapper = new DagreWrapper(g)
    activityDraw = new ActivityDraw(model, g)
    if (isDev) {
      ;(window as any).activityDraw = activityDraw
    }

    ir.steps.forEach(step => {
      activityDraw.drawStep(rootMark, step)
    })
    ir.notes.forEach(note => {
      activityDraw.drawNote(rootMark, note)
    })

    dagreWrapper.doLayout()

    dagreWrapper.callNodeOnLayout()

    const { bounds: edgeBounds } = drawEdges(rootMark, g)

    const bounds = tryExpandBounds(dagreWrapper.getGraphBounds(), edgeBounds)
    const { title } = ir
    let titleSize: Maybe<TSize> = undefined
    if (title) {
      const titleFont: IFont = { fontSize: conf.fontSize, fontFamily: conf.fontFamily }
      titleSize = calculateTextDimensions(title, titleFont)
      const titleHeight = titleSize.height
      rootMark.children.push({
        type: 'text',
        attrs: {
          text: title,
          x: bounds.left + bounds.width / 2,
          y: -titleHeight,
          ...titleFont,
          fill: conf.textColor,
          textAlign: 'center',
          fontWeight: 'bold',
        },
        class: 'activity__title',
      })
      titleSize.height += conf.fontSize
    }

    // console.log('bounds', bounds)
    const { width, height } = adjustRootMarkBounds({
      rootMark,
      gBounds: bounds,
      padX: conf.diagramPadding,
      padY: conf.diagramPadding,
      useMaxWidth: conf.useMaxWidth,
      containerSize: opts?.containerSize,
      titleSize,
    })

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

function getActionRectSize(text: string) {
  const textDims = calcTextDims(text)
  const rectWidth = textDims.width + conf.actionPaddingX * 2
  const rectHeight = textDims.height + conf.actionPaddingY * 2
  return { rectWidth, rectHeight }
}

class ArtistModel {
  constructor(public ir: ActivityDiagramIR) {}

  stepModelMap = new Map<string, StepModel>()
  stepNotesMap = new Map<string, Note[]>()
  stepArrowLabelMap = new Map<string, ArrowLabel>()

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
          // prevIds = [step.value.id]
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
        case 'repeat': {
          processRecursiveStep(step, stepModel)
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
        case 'fork': {
          const fork = step.value as Fork
          processRecursiveStep(step, stepModel, { childrenKeys: ['branches'], parallelChildren: true })
          const endId = `${fork.id}-end`
          safeAssign(stepModel, {
            endId,
          })
          break
        }
        case 'forkBranch': {
          processRecursiveStep(step, stepModel)
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
    ir.arrowLabels.forEach(arrowLabel => {
      const parentId = arrowLabel.target
      if (parentId && this.stepModelMap.has(parentId)) {
        this.stepArrowLabelMap.set(parentId, arrowLabel)
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
  // startMark: Group | Rect
  startMark: Mark
  outLabel?: string
  stepModel?: StepModel
  hasEnded?: boolean
  hasDetached?: boolean
}

class ActivityDraw {
  private keywordStepResults: { [key: string]: DrawStepResult } = {}
  private results: { [key: string]: DrawStepResult } = {}

  constructor(
    public model: ArtistModel,
    public g: LayoutGraph,
  ) {}

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
      case 'repeat': {
        result = this.drawRepeat(rootMark, step.value as Repeat)
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
      case 'fork': {
        result = this.drawFork(rootMark, step.value as Fork)
        break
      }
      case 'forkBranch': {
        result = this.drawForkBranch(rootMark, step.value as ForkBranch)
        break
      }
      default:
        break
    }

    if (result && result.stepModel) {
      this.results[result.id] = result
      if (result.endId) this.results[result.endId] = result

      const prevId = result.stepModel.prevId
      const startIdOfCurrent = result.stepModel.startId || result.stepModel.id
      let label = ''
      const arrowLabel = this.model.stepArrowLabelMap.get(prevId)
      if (arrowLabel) {
        label = arrowLabel.text
      }
      if (prevId) {
        const prevStepModel = this.model.stepModelMap.get(prevId)
        const prevResult = this.results[prevId]
        if (!label && prevResult?.outLabel) {
          label = prevResult.outLabel
        }
        if (prevId === this.keywordStepResults.start?.id) {
          g.setEdge(prevId, startIdOfCurrent, { label })
        } else if (prevStepModel && prevStepModel.type === 'keyword') {
          g.setEdge(prevId, startIdOfCurrent, { label, isDummyEdge: true } as EdgeData)
        } else if (result.hasDetached) {
          g.setEdge(prevId, startIdOfCurrent, { label, isDummyEdge: true } as EdgeData)
        } else {
          g.setEdge(prevId, startIdOfCurrent, { label })
        }
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
    const group = makeEmptyGroup()
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

    const drawChildren = (children: Step[], label: string) => {
      let hasEnded = false
      const lastChildResult = last(
        children.map((child, i) => {
          if (hasEnded) return
          const childResult = this.drawStep(parentMark, child)
          if (child.type === 'keyword') {
            hasEnded = true
          }
          if (i === 0) {
            this.linkResult(id, childResult, label)
          }
          return childResult
        }),
      )
      if (lastChildResult) {
        this.g.setEdge(lastChildResult.endId || lastChildResult.id, endId, {
          label: '',
          isDummyEdge: hasEnded,
        } as EdgeData)
      }
    }

    drawChildren(condition.then.children, condition.then.label || 'yes')

    if (condition.else) {
      drawChildren(condition.else.children, 'no')
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

    const textDims = calcTextDims(message)

    const textMark = makeTextMark(conf, message, textDims, {
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

    const moveDiamond = (x: number, y: number) => {
      // for some strange reason, we can't specify two move commands at the first of the path,
      // otherwise the path will be invalid in canvas output, may be a 'g-canvas' bug or something else.
      // here is a trick to make the path commands valid and diamond centered.
      const firstCommand = (diamondMark.attrs.path as PathCommand[])[0]
      firstCommand[1] = x - diamondSide
      firstCommand[2] = y
    }

    this.g.setNode(id, {
      id: id,
      mark: diamondMark,
      width: diamondSide * 2,
      height: diamondSide * 2,
      onLayout(data) {
        moveDiamond(data.x, data.y)
      },
    })

    return {
      mark: diamondMark,
      diamondSide,
      moveDiamond,
    }
  }

  drawWhile(parentMark: Group, wh: While): DrawStepResult {
    const { message, id } = wh
    const group = makeEmptyGroup()
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
    if (lastChildResult) {
      this.g.setEdge(lastChildResult.endId || lastChildResult.id, id, { label: '' })
      this.g.setEdge(lastChildResult.endId || lastChildResult.id, endId, { label: '', isDummyEdge: true } as EdgeData)
    }
    this.g.setEdge(id, endId, { label: wh.denyLabel || '' }) // to end mark

    return result
  }

  drawGroup(parentMark: Group, aGroup: AGroup): DrawStepResult {
    const { id } = aGroup
    const group = makeEmptyGroup()

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
    const fontConfig = getFontConfig(conf)

    const labelMark = makeMark(
      'text',
      {
        text: groupLabel,
        fill: conf.textColor,
        ...fontConfig,
        fontWeight: 'bold',
      },
      { class: 'activity__group-rect' },
    )
    const labelTextDims = calcTextDims(groupLabel, fontConfig)

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

    const setParentRecursive = (m: StepModel) => {
      if (m.type === 'group') return
      unique(compact([m.id, m.startId, m.endId])).forEach(modelId => {
        // console.log('will set parent', modelId, id, m.type)
        if (modelId) this.g.setParent(modelId, id)
      })
      this.traverseStep(m, child => {
        const childStepModel = this.model.stepModelMap.get(child.value.id)
        if (childStepModel) setParentRecursive(childStepModel)
      })
    }

    aGroup.children.map(s => {
      const childResult = this.drawStep(parentMark, s)
      this.g.setParent(childResult.id, id)
      setParentRecursive(childResult.stepModel)
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

    s.children.map((caseStep: Step<Case>) => {
      const childResult = this.drawStep(parentMark, caseStep)
      // console.log('[drawSwitch]childResult', childResult)
      this.g.setEdge(id, childResult.stepModel.startId || childResult.id, {
        label: caseStep.value.confirmLabel,
        simplifyStartEdge: true,
      } as EdgeData)
      if (!childResult.hasEnded) {
        this.g.setEdge(childResult.endId, endId, { label: '' })
      }
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
      hasEnded: false,
    }

    parentMark.children.push(group)

    if (c.children.length) {
      c.children.forEach(caseClause => {
        if (result.hasEnded) return
        if (caseClause.type === 'keyword') {
          result.hasEnded = true
        }
        this.drawStep(parentMark, caseClause)
      })
    } else {
      const holderMark = makeCircle({
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

  drawRepeat(parentMark: Group, repeat: Repeat): DrawStepResult {
    const { message, id } = repeat
    const denyLabel = repeat.denyLabel || 'no'
    const group = makeEmptyGroup()
    const stepModel = model.stepModelMap.get(id)

    const { bgMark: decisionBg, textMark, rectWidth, rectHeight } = this.drawDecisionMarks(message)

    const endId = stepModel.endId
    const startId = stepModel.id
    const result: DrawStepResult = {
      id,
      startMark: group,
      stepModel,
      endId,
      outLabel: denyLabel,
    }

    let startMark: Mark
    if (repeat.firstAction) {
      const firstActionGroup = makeEmptyGroup()
      firstActionGroup.class = 'activity__repeat-start'
      const { rectMark, textMark, actionInfo } = drawActionMarks({ message: repeat.firstAction.message, conf })
      firstActionGroup.children.push(rectMark, textMark)
      startMark = firstActionGroup

      this.g.setNode(startId, {
        id: startId,
        mark: firstActionGroup,
        width: actionInfo.rectWidth,
        height: actionInfo.rectHeight,
        onLayout(data) {
          positionGroupContents(firstActionGroup, { ...data, x: data.x - data.width / 2, y: data.y - data.height / 2 })
        },
      })
    } else {
      const diamondResult = this.drawDiamondMark(startId, {}, { class: 'activity__repeat-start' })

      startMark = diamondResult.mark

      this.g.setNode(startId, {
        mark: startMark,
        width: diamondResult.diamondSide * 2,
        height: diamondResult.diamondSide * 2,
        onLayout(data) {
          diamondResult.moveDiamond(data.x, data.y)
        },
      })
    }

    result.startMark = startMark

    this.g.setNode(endId, {
      id: endId,
      mark: group,
      width: rectWidth,
      height: rectHeight,
      onLayout(data) {
        positionGroupContents(group, { ...data, x: data.x - data.width / 2, y: data.y - data.height / 2 })
      },
    })

    parentMark.children.push(group, startMark)
    group.children.push(decisionBg, textMark)

    const childrenResults = repeat.children.map((s, i) => {
      const childResult = this.drawStep(parentMark, s)
      return childResult
    })
    const firstChildResult = childrenResults[0]
    if (firstChildResult) {
      this.linkResult(startId, firstChildResult)
    }

    const lastChildResult = last(childrenResults)
    if (lastChildResult) {
      const hasEnded = lastChildResult.hasDetached || lastChildResult.hasEnded
      this.g.setEdge(lastChildResult.endId || lastChildResult.id, endId, { isDummyEdge: hasEnded } as EdgeData)
    }
    this.g.setEdge(endId, startId, { label: repeat.confirmLabel || '' })

    return result
  }

  drawKeyword(parentMark: Group, keyword: Keyword): DrawStepResult {
    const stepModel = model.stepModelMap.get(keyword.id)
    const group = makeEmptyGroup()
    group.class = 'activity__keyword'
    const { label, id } = keyword
    const r = 10
    const stroke = conf.keywordBackground
    const fill = conf.keywordBackground
    if (label === 'start') {
      const bgMark = makeCircle({
        r,
        fill,
      })
      group.children.push(bgMark)
    } else if (label === 'stop' || label === 'end') {
      const bgMark = makeCircle({
        r,
        stroke,
      })
      const centerCircle = makeCircle({
        r: r * 0.6,
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
    const hasDetached = isDetachAlikeKeyword(keyword)
    const result: DrawStepResult = {
      id,
      startMark: group,
      stepModel,
      hasEnded: isEndAlikeKeyword(keyword),
      hasDetached,
    }
    return result
  }

  traverseStepCollection = (steps: Step[], cb: (child: Step) => boolean | void) => {
    if (!steps) return
    let shouldStop = false
    steps.forEach(child => {
      if (cb(child) === false) {
        shouldStop = true
        return
      }
      this.traverseStep(child, cb)
    })
    return !shouldStop
  }

  traverseStep = (step: Step, cb: (child: Step) => boolean | void) => {
    if (!step) return
    const value = step.value
    if ('children' in value) {
      this.traverseStepCollection(value.children, cb)
    } else if ('then' in value) {
      this.traverseStepCollection(value.then.children, cb)
      if (value.else) {
        this.traverseStepCollection(value.else.children, cb)
      }
    } else if ('branches' in value) {
      this.traverseStepCollection(value.branches, cb)
    }
  }

  drawFork(parentMark: Group, fork: Fork): DrawStepResult {
    const { id } = fork
    const group = makeEmptyGroup()
    const stepModel = model.stepModelMap.get(id)

    const startMark = makeMark('rect', {
      width: 100, // this width doesn't matter, later we will replace it with frame width
      height: 4,
      x: 0,
      y: 0,
      fill: conf.keywordBackground,
      radius: 2,
    })

    const getFrameBounds = () => {
      const bounds = this.g.node(frameId) as LayoutNode
      return bounds
    }

    const getBorderShrinkedWidth = (bounds: LayoutNode) => {
      const shrinkedWidth = bounds.width - 2 * conf.edgesep
      const x = bounds.x + conf.actionPaddingX // TODO: why this hack
      return { ...bounds, width: shrinkedWidth, x }
    }

    this.g.setNode(id, {
      id: id,
      mark: group,
      width: startMark.attrs.width,
      height: startMark.attrs.height,
      onLayout: data => {
        // console.log('[drawFork] start onLayout', data, id)
        const fb = getBorderShrinkedWidth(getFrameBounds())
        if (fb) {
          safeAssign(startMark.attrs, { x: fb.x - fb.width / 2, y: data.y - data.height / 2, width: fb.width })
          data.width = fb.width
        }
      },
    })

    const endId = stepModel.endId
    const result: DrawStepResult = {
      id,
      startMark,
      stepModel,
      endId,
    }

    const frameId = `${id}-frame`
    this.g.setNode(frameId, {
      mark: group,
      width: 0,
      // onLayout(data) {
      //   console.log('[drawFork] frame onLayout', data)
      // },
    })

    let endMark: Mark

    if (!fork.shouldMerge) {
      endMark = makeMark('rect', {
        ...startMark.attrs,
      })
      this.g.setNode(endId, {
        id: endId,
        mark: endMark,
        width: endMark.attrs.width,
        height: endMark.attrs.height,
        onLayout(data) {
          // console.log('[drawFork] end onLayout', data)
          const fb = getBorderShrinkedWidth(getFrameBounds())
          if (fb) {
            safeAssign(endMark.attrs, { x: fb.x - fb.width / 2, y: data.y - data.height / 2, width: fb.width })
            data.width = fb.width
          }
        },
      })
    } else {
      const { mark: diamondMark, diamondSide, moveDiamond } = this.drawDiamondMark(endId)
      endMark = diamondMark
      this.g.setNode(endId, {
        id: endId,
        mark: endMark,
        width: endMark.attrs.width,
        height: endMark.attrs.height,
        onLayout(data) {
          const fb = getFrameBounds()
          if (fb) {
            moveDiamond(fb.x + diamondSide + 1, data.y) // why is this +1 ?
          }
        },
      })
    }

    group.children.push(startMark)
    parentMark.children.push(group, endMark)

    fork.branches.map((branch: Step<ForkBranch>) => {
      const childResult = this.drawStep(group, branch)
      const firstChildId = branch.value.children[0]?.value.id
      if (firstChildId) {
        this.g.setEdge(id, firstChildId, {
          label: '',
          isForkStartStraightLine: true,
        } as EdgeData)
      }

      let hasEnded = false
      const childrenIds = branch.value.children.map(o => o.value.id)
      childrenIds.forEach(childId => {
        if (hasEnded) return
        const childStepModel = this.model.stepModelMap.get(childId)
        if (childStepModel && childStepModel.type === 'keyword') {
          hasEnded = true
        }
        this.g.setParent(childId, frameId)
      })

      this.g.setEdge(childResult.endId, endId, {
        label: '',
        isForkEndStraightLine: !fork.shouldMerge,
        isDummyEdge: hasEnded,
      } as EdgeData)
      return childResult
    })
    return result
  }
  drawForkBranch(parentMark: Group, branch: ForkBranch): DrawStepResult {
    const { id } = branch
    const group = makeEmptyGroup()
    const stepModel = model.stepModelMap.get(id)

    const result: DrawStepResult = {
      id,
      startMark: group,
      stepModel,
      endId: '',
    }

    parentMark.children.push(group)

    const childResults = branch.children.map((step: Step) => {
      const childResult = this.drawStep(parentMark, step)
      group.children.push(childResult.startMark)
      return childResult
    })
    const lastChild = last(childResults)
    if (lastChild) {
      result.endId = lastChild.id
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

    const fontConfig = { fontSize: conf.fontSize, fontFamily: conf.fontFamily }
    const textDims = calcTextDims(text, fontConfig)
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
      attrs: { fill: conf.noteTextColor, text, textBaseline: 'middle', ...fontConfig },
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
      onLayout: () => {
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
          y: y + textDims.height / 2 + conf.noteMargin,
          width: noteModel.width,
        })

        safeAssign(rectAttrs, {
          x,
          y,
          width: noteModel.width,
          height: noteModel.height,
        })

        const node = this.g.node(id)
        node.outerLeft = x
        node.outerRight = x + noteModel.width
      },
    })
    group.children.push(noteRect, textMark)
  }
}

function drawAction(parentMark: Group, action: Action, g: LayoutGraph): DrawStepResult {
  const stepModel = model.stepModelMap.get(action.id)
  const group = makeEmptyGroup()
  const { textMark, rectMark, actionInfo } = drawActionMarks({ message: action.message, conf })
  const { rectWidth, rectHeight } = actionInfo
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

type DrawActionMarksOpts = {
  message: string
  conf: ActivityConf
}

function drawActionMarks({ message, conf }: DrawActionMarksOpts) {
  const fontConfig = getFontConfig(conf)
  const textDims = getTextDimensionsInPresicion(message, fontConfig)
  const actionInfo = getActionRectSize(message)
  const rectMark = makeMark('rect', {
    width: actionInfo.rectWidth,
    height: actionInfo.rectHeight,
    x: 0,
    y: 0,
    fill: conf.actionBackground,
    stroke: conf.actionBorderColor,
  })
  const textMark = makeTextMark(conf, message, textDims, {
    y: actionInfo.rectHeight / 2,
    x: actionInfo.rectWidth / 2,
    ...fontConfig,
    textBaseline: 'middle',
    textAlign: 'center',
  })

  return {
    rectMark,
    textMark,
    actionInfo,
  }
}

type EdgeData = LayoutEdge<{
  label?: string
  simplifyStartEdge?: boolean
  isForkStartStraightLine?: boolean
  isForkEndStraightLine?: boolean
  /** this edge is for layout, should not be drawn */
  isDummyEdge?: boolean
}>

function drawEdges(parent: Group, g: LayoutGraph) {
  const edgeGroup = makeMark('group', {}, { children: [] })
  const bounds = makeBounds()

  g.edges().forEach(e => {
    const edge: EdgeData = g.edge(e)
    if (!edge.points) return

    updateBoundsByPoints(bounds, edge.points)

    if (edge.isDummyEdge) return

    const [startPoint, ...restPoints] = edge.points
    const lastPoint = restPoints[restPoints.length - 1]
    // if (edge.simplifyStartEdge) {
    //   const secondPoint = restPoints[0]
    //   safeAssign(secondPoint, {
    //     y: startPoint.y,
    //   })
    // }
    if (edge.isForkStartStraightLine) {
      edge.points.slice(0, edge.points.length - 2).forEach(p => {
        safeAssign(p, {
          x: lastPoint.x,
        })
      })
    } else if (edge.isForkEndStraightLine) {
      edge.points.slice(1).forEach(p => {
        safeAssign(p, {
          x: startPoint.x,
        })
      })
    }

    const shouldUseCurvePath = conf.edgeType === 'curved'
    const path = shouldUseCurvePath ? getPointsCurvePath(edge.points) : getPointsLinearPath(edge.points)

    const linePath = makeMark('path', {
      path,
      stroke: conf.edgeColor,
      lineJoin: 'round',
    })
    const pointsForDirection = restPoints.slice(-2)
    const arrowRad = calcDirection.apply(null, pointsForDirection)
    const arrowMark = drawArrowTo(lastPoint, 8, arrowRad, {
      color: conf.edgeColor,
    })

    // Find the half-way point
    const labelPoint = edge.labelPoint || getPointAt(edge.points, 0.4, true)
    if (!labelPoint) return
    const labelX = labelPoint.x
    const labelY = labelPoint.y
    // if (edge.simplifyStartEdge) {
    //   labelY = (startPoint.y + lastPoint.y) / 2
    // }

    let labelMark: Text | null = null
    let labelBgMark: Rect | null = null
    if (edge.label) {
      const fontConfig = getFontConfig(conf)
      const labelDims = calcTextDims(edge.label, fontConfig)
      labelBgMark = makeLabelBg(labelDims, { x: labelX, y: labelY }, { fill: conf.labelBackground }, theme)
      labelMark = makeMark(
        'text',
        {
          text: edge.label,
          id: [e.v, e.w].join('-'),
          textAlign: 'center',
          textBaseline: 'middle',
          x: labelX,
          y: labelY,
          fill: conf.labelTextColor,
          ...fontConfig,
        },
        { class: 'activity__edge-label' },
      )
      const labelBounds: Bounds = calcBound([labelBgMark])
      tryExpandBounds(bounds, labelBounds)
    }

    edgeGroup.children.push(...compact([linePath, labelBgMark, labelMark, arrowMark]))

    // debug
    // const debugMark = makeCircleWithCoordInPoint(labelPoint)
    // edgeGroup.children.push(debugMark)
  })
  parent.children.push(edgeGroup)
  return { bounds }
}

function getFontConfig(conf: ActivityConf) {
  return {
    fontSize: conf.fontSize,
    fontFamily: conf.fontFamily,
  }
}

export default erArtist
