import {
  GraphicsIR,
  IDiagramArtist,
  logger,
  Mark,
  MarkAttrs,
  Rect,
  Group,
  Text,
  Point,
  Line,
  Path,
  safeAssign,
  mat3,
  calculateTextDimensions,
  makeid,
  configApi,
  symbolRegistry,
  ContentArea,
  clamp,
  PintoraConfig,
  ITheme,
  compact,
  Bounds,
  TSize,
  GSymbol,
} from '@pintora/core'
import { db, SequenceDiagramIR, LINETYPE, Message, PLACEMENT, WrappedText, ParticipantBox } from './db'
import { ActivationData, LoopModel, SequenceDiagramBounds, MessageModel } from './artist/type'
import { SequenceConf, getConf } from './config'
import { getBaseNote, drawArrowTo, drawCrossTo, getBaseText, makeMark } from './artist-util'
import { makeBounds, tryExpandBounds } from '../util/mark-positioner'
import { drawDivider } from './artist/divider'
import { drawLoopTo } from './artist/loop'
import { makeEmptyGroup } from '../util/artist-util'
import { getTextDimensionsInPresicion } from '../util/text'

let conf: SequenceConf
let theme: ITheme

type DrawResult<T extends Mark = Mark> = {
  mark: T
}

const GROUP_LABEL_MAP = {
  [LINETYPE.LOOP_END]: 'loop',
  [LINETYPE.ALT_END]: 'alt',
  [LINETYPE.OPT_END]: 'opt',
  [LINETYPE.PAR_END]: 'par',
  [LINETYPE.LOOP_START]: 'loop',
  [LINETYPE.ALT_START]: 'alt',
  [LINETYPE.OPT_START]: 'opt',
  [LINETYPE.PAR_START]: 'par',
}

export type SequenceArtistContext = {
  rootMark: Group
  ir: SequenceDiagramIR
  conf: SequenceConf
  model: Model
}

const SHOW_NUMBER_CIRCLE_RADIUS = 8

const sequenceArtist: IDiagramArtist<SequenceDiagramIR, SequenceConf> = {
  draw(ir, config?, opts?) {
    // console.log('[draw]', ir, config)
    conf = getConf(ir, config)
    theme = (configApi.getConfig() as PintoraConfig).themeConfig.themeVariables
    model.init()
    // logger.debug(`C:${JSON.stringify(conf, null, 2)}`)

    // Fetch data from the parsing
    const { messages, title } = ir
    const actorKeys = db.getActorKeys()

    const rootMark = makeEmptyGroup()

    const context: SequenceArtistContext = {
      ir,
      rootMark,
      conf,
      model,
    }

    actorKeys.forEach(key => {
      model.actorAttrsMap.set(key, { fill: conf.actorBackground, stroke: conf.actorBorderColor })
    })

    model.initBoxInfos(ir)

    let startVerticalPos = 0
    if (model.hasParticipantBox()) {
      const vPos = conf.participantBoxPadding * 2 + model.participantBoxStats.maxTitleHeight
      startVerticalPos = model.bumpVerticalPos(vPos)
    }

    calcLoopMinWidths(ir.messages)
    const maxMessageWidthPerActor = getMaxMessageWidthPerActor(ir)
    model.maxMessageWidthPerActor = maxMessageWidthPerActor
    const actorsCalcResult = calculateActorMargins(context, maxMessageWidthPerActor)
    model.actorHeight = actorsCalcResult.actorHeight

    drawActors(rootMark, ir, { verticalPos: startVerticalPos })
    const loopWidths = calculateLoopBounds(messages)

    const activationGroup = makeMark(
      'group',
      {},
      {
        children: [],
        class: 'activations',
      },
    )
    // push this group early so it won't lay on top of other messages
    rootMark.children.push(activationGroup)
    function activeEnd(msg: Message, verticalPos: number) {
      const activationData = model.endActivation(msg)
      if (activationData.starty + 18 > verticalPos) {
        activationData.starty = verticalPos - 6
        verticalPos += 12
      }
      drawActivationTo(activationGroup, activationData)

      model.insert(activationData.startx, verticalPos - 10, activationData.stopx, verticalPos)
    }

    // Draw the messages/signals
    let sequenceIndex = 1
    messages.forEach(function (msg) {
      let loopModel, noteModel, msgModel

      switch (msg.type) {
        case LINETYPE.NOTE:
          noteModel = model.noteModelMap.get(msg.id)
          drawNoteTo(noteModel, rootMark)
          break
        case LINETYPE.ACTIVE_START:
          model.newActivation(msg)
          break
        case LINETYPE.ACTIVE_END:
          activeEnd(msg, model.verticalPos)
          break
        case LINETYPE.LOOP_START:
        case LINETYPE.OPT_START:
        case LINETYPE.ALT_START:
        case LINETYPE.PAR_START:
          adjustLoopSizeForWrap(
            loopWidths,
            msg,
            conf.boxMargin,
            conf.boxMargin + conf.boxTextMargin,
            ({ message, width }) => {
              const fill = msg.attrs?.background
              model.newLoop(message, width, fill)
            },
          )
          break
        case LINETYPE.ALT_ELSE:
        case LINETYPE.PAR_AND:
          adjustLoopSizeForWrap(
            loopWidths,
            msg,
            conf.boxMargin,
            conf.boxMargin + conf.boxTextMargin,
            ({ message, width }) => {
              const fill = msg.attrs?.background
              model.addSectionToLoop(message, width, fill)
            },
          )
          break
        case LINETYPE.LOOP_END:
        case LINETYPE.ALT_END:
        case LINETYPE.OPT_END:
        case LINETYPE.PAR_END:
          loopModel = model.endLoop()
          const label = GROUP_LABEL_MAP[msg.type]
          drawLoopTo(context, loopModel, label)
          model.bumpVerticalPos(loopModel.stopy - model.verticalPos)
          model.loops.push(loopModel)
          break
        case LINETYPE.DIVIDER:
          msgModel = model.dividerMap.get(msg.id)
          drawDivider(context, msgModel)
          break
        default:
          try {
            msgModel = model.msgModelMap.get(msg.id) // FI
            if (!msgModel) {
              console.warn('no msgModel for', msg)
              return
            }
            msgModel.starty = model.verticalPos
            // console.log('msgModel starty', msgModel, model.verticalPos)
            msgModel.sequenceIndex = sequenceIndex
            rootMark.children.push(drawMessage(msgModel).mark)
          } catch (e) {
            logger.error('error while drawing message', e)
          }
      }
      // Increment sequence counter if msg.type is a line (and not another event like activation or note, etc)
      if (
        [
          LINETYPE.SOLID_OPEN,
          LINETYPE.DOTTED_OPEN,
          LINETYPE.SOLID,
          LINETYPE.DOTTED,
          LINETYPE.SOLID_CROSS,
          LINETYPE.DOTTED_CROSS,
          LINETYPE.SOLID_POINT,
          LINETYPE.DOTTED_POINT,
        ].includes(msg.type)
      ) {
        sequenceIndex++
      }
    })

    if (conf.mirrorActors) {
      // Draw actors below diagram
      model.bumpVerticalPos(conf.boxMargin * 2)
      drawActors(rootMark, ir, { verticalPos: model.verticalPos, isMirror: true })
    }

    if (model.hasParticipantBox()) {
      model.bumpVerticalPos(conf.participantBoxPadding)
    }

    rootMark.children = [...model.groupBgs, ...rootMark.children]

    drawParticipantBoxes(context)

    const box = model.getBounds()

    if (title) {
      const titleFont = actorFont(conf)
      rootMark.children.push({
        type: 'text',
        attrs: {
          text: title,
          x: box.startx + (box.stopx - box.startx) / 2,
          y: -20,
          ...titleFont,
          fill: conf.actorTextColor,
          textAlign: 'center',
          fontWeight: 'bold',
        },
        class: 'sequence__title',
      })
    }

    model.emitBoundsFinish()

    const doublePadX = 2 * conf.diagramMarginX
    const doublePadY = 2 * conf.diagramMarginY

    const extraVertForTitle = title ? 40 : 0
    const contentWidth = box.stopx - box.startx
    let contentHeight = box.stopy - box.starty + extraVertForTitle
    if (conf.mirrorActors) {
      contentHeight = contentHeight + conf.boxMargin
    }
    const containerWidth = opts.containerSize?.width
    const scaleX = (conf.useMaxWidth && containerWidth && containerWidth / (contentWidth + doublePadX)) || 1
    const width = Math.round(scaleX * (contentWidth + doublePadX))
    const height = Math.round(scaleX * (contentHeight + doublePadY))

    const leftPad = Math.abs(Math.min(0, box.startx)) // to compensate negative stopx
    rootMark.matrix = mat3.translate(mat3.create(), mat3.fromScaling(mat3.create(), [scaleX, scaleX]), [
      conf.diagramMarginX + leftPad,
      conf.diagramMarginY + extraVertForTitle,
    ])

    const graphicsIR: GraphicsIR = {
      mark: rootMark,
      width,
      height,
    }

    return graphicsIR
  },
}

type OnBoundsFinishCallback = (opts: { bounds: SequenceDiagramBounds }) => void

type PosTempInfo = Partial<{
  extraMarginForBox: number
}>

export enum BumpType {
  /** box like loop and alt */
  Box = 1,
}

type BoxInfo = {
  width: number
  actorMarks: Mark[]
  bounds: Bounds
  textDims: TSize
  participantBox: ParticipantBox
}

class Model {
  sequenceItems: LoopModel[]
  activations: ActivationData[] = []
  data: SequenceDiagramBounds
  verticalPos: number
  actorAttrsMap = new Map<string, MarkAttrs>()
  msgModelMap = new Map<string, MessageModel>()
  actorLineMarkMap = new Map<string, Line>()
  maxMessageWidthPerActor: { [key: string]: number } = {}
  noteModelMap = new Map<string, MessageModel>()
  loops: LoopModel[]
  loopMinWidths: Record<string, number>
  dividerMap = new Map<string, MessageModel>()
  /** backgrounds for groups like loop and opt */
  groupBgs: Rect[]
  posTempInfo: PosTempInfo = {}
  // participant boxes
  boxInfos = new Map<string, BoxInfo>()
  participantBoxStats = { maxTitleHeight: 0 }

  actorHeight: number

  private onBoundsFinishCbs: Array<OnBoundsFinishCallback>

  init() {
    this.sequenceItems = []
    this.clear()
    this.data = {
      startx: 0,
      stopx: 0,
      starty: 0,
      stopy: 0,
    }
    this.activations = []
    this.verticalPos = 0
    this.loops = []
    this.loopMinWidths = {}
    this.onBoundsFinishCbs = []
    this.groupBgs = []
    this.actorHeight = conf.actorHeight
  }
  clear() {
    this.activations = []
    this.actorAttrsMap.clear()
    this.actorLineMarkMap.clear()
    this.msgModelMap.clear()
    this.maxMessageWidthPerActor = {}
    this.noteModelMap.clear()
    this.dividerMap.clear()
    this.onBoundsFinishCbs = []
    this.groupBgs = []
    this.loopMinWidths = {}
    this.posTempInfo = {}
    this.boxInfos.clear()
  }
  updateVal(obj, key, val, fun) {
    if (typeof obj[key] === 'undefined') {
      obj[key] = val
    } else {
      obj[key] = fun(val, obj[key])
    }
  }
  updateBounds(startx: number, starty: number, stopx: number, stopy: number) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _self = this
    let cnt = 0
    // console.log('updateBounds', startx, starty, stopx, stopy)
    function updateFn(type?: string) {
      return function updateItemBounds(item) {
        cnt++
        // The loop sequenceItems is a stack so the biggest margins in the beginning of the sequenceItems
        const n = _self.sequenceItems.length - cnt + 1

        _self.updateVal(item, 'starty', starty - n * conf.boxMargin, Math.min)
        _self.updateVal(item, 'stopy', stopy + n * conf.boxMargin, Math.max)

        const sequenceItem = _self.sequenceItems[_self.sequenceItems.length - 1]
        const groupItemStopx = Math.max(stopx, startx + sequenceItem?.width || 0) + n * conf.boxMargin

        _self.updateVal(_self.data, 'startx', startx - n * conf.boxMargin, Math.min)
        // _self.updateVal(_self.data, 'stopx', stopx + n * conf.boxMargin, Math.max)
        _self.updateVal(_self.data, 'stopx', groupItemStopx, Math.max)

        if (!(type === 'activation')) {
          _self.updateVal(item, 'startx', startx - n * conf.boxMargin, Math.min)
          // _self.updateVal(item, 'stopx', stopx + n * conf.boxMargin, Math.max)
          _self.updateVal(item, 'stopx', groupItemStopx, Math.max)

          _self.updateVal(_self.data, 'starty', starty - n * conf.boxMargin, Math.min)
          _self.updateVal(_self.data, 'stopy', stopy + n * conf.boxMargin, Math.max)
        }
      }
    }

    this.sequenceItems.forEach(updateFn())
    this.activations.forEach(updateFn('activation'))
  }
  insert(startx: number, starty: number, stopx: number, stopy) {
    // console.log('insert', startx, starty, stopx, stopy)
    const _startx = Math.min(startx, stopx)
    const _stopx = Math.max(startx, stopx)
    const _starty = Math.min(starty, stopy)
    const _stopy = Math.max(starty, stopy)

    // const hasInvalid = Array.from(arguments).some(v => v === undefined || isNaN(v))
    // if (hasInvalid) {
    //   console.warn('has invalid', arguments)
    //   debugger
    // }

    this.updateVal(this.data, 'startx', _startx, Math.min)
    this.updateVal(this.data, 'starty', _starty, Math.min)
    this.updateVal(this.data, 'stopx', _stopx, Math.max)
    this.updateVal(this.data, 'stopy', _stopy, Math.max)

    this.updateBounds(_startx, _starty, _stopx, _stopy)
  }
  newActivation(message: Message) {
    const actorRect = this.actorAttrsMap.get(message.from)
    const stackedSize = actorActivations(message.from).length || 0
    const x = actorRect.x + actorRect.width / 2 + ((stackedSize - 1) * conf.activationWidth) / 2
    this.activations.push({
      startx: x,
      starty: this.verticalPos + 2,
      stopx: x + conf.activationWidth,
      stopy: undefined,
      actor: message.from,
    })
  }
  endActivation(message: Message) {
    // find most recent activation for given actor
    const lastActorActivationIdx = this.activations
      .map(activation => {
        return activation.actor
      })
      .lastIndexOf(message.from)
    return this.activations.splice(lastActorActivationIdx, 1)[0]
  }
  createLoop(title: WrappedText = { text: undefined, wrap: false }, width: number, fill?) {
    return {
      startx: undefined,
      starty: this.verticalPos,
      stopx: undefined,
      stopy: undefined,
      title: title.text,
      wrap: title.wrap,
      width,
      height: 0,
      fill: fill,
    }
  }
  newLoop(title: WrappedText = { text: undefined, wrap: false }, width: number, fill?) {
    this.sequenceItems.push(this.createLoop(title, width, fill))
  }
  endLoop() {
    return this.sequenceItems.pop()
  }
  addSectionToLoop(message: Message, width: number, fill?: string) {
    const loop = this.sequenceItems.pop()
    loop.sections = loop.sections || []
    loop.sections.push({ y: this.verticalPos, width, height: 0, fill, message })
    this.sequenceItems.push(loop)
  }
  bumpVerticalPos(bump: number, tempInfo?: PosTempInfo) {
    this.verticalPos = this.verticalPos + bump
    this.data.stopy = this.verticalPos

    this.posTempInfo = tempInfo || {}
    return this.verticalPos
  }
  tryBumpType(types: Partial<Record<BumpType, boolean>>) {
    const { posTempInfo } = this
    let pos = 0
    if (types[BumpType.Box] && posTempInfo.extraMarginForBox) {
      pos += posTempInfo.extraMarginForBox
    }
    this.bumpVerticalPos(pos)
  }

  getBounds() {
    return this.data
  }

  getHeight() {
    const actorHeight =
      this.actorAttrsMap.size === 0
        ? 0
        : Array.from(this.actorAttrsMap.values()).reduce((acc, actor) => {
            return Math.max(acc, actor.height || 0)
          }, 0)
    const messagesHeight = this.msgModelMap.size
      ? Array.from(this.msgModelMap.values()).reduce((acc, h) => acc + h.height, 0)
      : 0
    const notesHeight = this.noteModelMap.size
      ? Array.from(this.noteModelMap.values()).reduce((acc, h) => acc + h.height, 0)
      : 0

    const loopsHeight = this.loops.reduce((acc, h) => acc + h.height, 0)
    return actorHeight + messagesHeight + notesHeight + loopsHeight
  }

  getBoxInfo(boxId: string) {
    return this.boxInfos.get(boxId)
  }

  initBoxInfos(ir: SequenceDiagramIR) {
    let maxTitleHeight = 0
    for (const actorBox of Object.values(ir.participantBoxes)) {
      const id = actorBox.id
      let boxInfo = this.boxInfos.get(id)
      if (id) {
        if (!boxInfo) {
          const fontConfig = messageFont(conf)
          boxInfo = {
            width: 0,
            actorMarks: [],
            bounds: makeBounds(),
            textDims: getTextDimensionsInPresicion(actorBox.text || '', fontConfig),
            participantBox: actorBox,
          }
          if (actorBox.text) {
            maxTitleHeight = Math.max(maxTitleHeight, boxInfo.textDims.height)
          }
          this.boxInfos.set(id, boxInfo)
        }
      }
    }
    this.participantBoxStats = { maxTitleHeight }
  }

  hasParticipantBox() {
    return this.boxInfos.size > 0
  }

  /**
   * Some elements (such as dividers) can only decide their horizontal position after bounds are calculated
   **/
  onBoundsFinish(cb: OnBoundsFinishCallback) {
    this.onBoundsFinishCbs.push(cb)
  }
  emitBoundsFinish() {
    this.onBoundsFinishCbs.forEach(cb => {
      cb({ bounds: this.data })
    })
  }
}

const model = new Model()

const actorActivations = function (actor: string) {
  return model.activations.filter(function (activation) {
    return activation.actor === actor
  })
}

const activationBounds = function (actor: string) {
  // handle multiple stacked activations for same actor
  const actorAttrs = model.actorAttrsMap.get(actor)
  const activations = actorActivations(actor)

  const left = activations.reduce(function (acc, activation) {
    return Math.min(acc, activation.startx)
  }, actorAttrs.x + actorAttrs.width / 2)
  const right = activations.reduce(function (acc, activation) {
    return Math.max(acc, activation.stopx)
  }, actorAttrs.x + actorAttrs.width / 2)
  return [left, right]
}

function adjustLoopSizeForWrap(
  loopWidths: Record<string, { width: number }>,
  msg: Message,
  preMargin,
  postMargin,
  addLoopFn: ({ message, width }) => void,
) {
  model.tryBumpType({ [BumpType.Box]: true })
  model.bumpVerticalPos(preMargin)
  let heightAdjust = postMargin
  let loopWidth = 0
  if (msg.id && msg.text && loopWidths[msg.id]) {
    const loopMinWidth = model.loopMinWidths[msg.id] || 0
    loopWidth = Math.max(loopWidths[msg.id].width, loopMinWidth)
    const textConf = messageFont(conf)
    msg.text = `[${msg.text}]`
    msg.wrap = true

    const textDims = calculateTextDimensions(msg.text, textConf)
    const totalOffset = Math.max(textDims.height, conf.labelBoxHeight)
    heightAdjust = postMargin + totalOffset
    logger.debug(`yOffset: ${totalOffset} - ${msg.text}`)
  }
  addLoopFn({ message: msg, width: loopWidth })
  model.bumpVerticalPos(heightAdjust)
}

/** get message font config from conf */
export const messageFont = (cnf: SequenceConf) => {
  return {
    fontFamily: cnf.messageFontFamily,
    fontSize: cnf.messageFontSize,
    fontWeight: cnf.messageFontWeight,
  }
}

const actorFont = messageFont
const noteFont = messageFont

function splitBreaks(text: string) {
  return text.split('\n')
}

/**
 * Draws a message
 */
const drawMessage = function (msgModel: MessageModel): DrawResult<Group> {
  model.bumpVerticalPos(conf.boxMargin)
  const { startx, stopx, starty, text, fromBound, type, sequenceIndex, itemId } = msgModel
  const linesCount = splitBreaks(text).length
  const textDims = calculateTextDimensions(text, messageFont(conf))
  const lineHeight = textDims.height / linesCount

  model.bumpVerticalPos(lineHeight)
  const tAttrs: Text['attrs'] = {
    text: '',
    textAlign: 'center',
    textBaseline: 'top',
    fill: conf.messageTextColor,
    stroke: conf.messageTextColor,
  }

  // console.log('drawMessage', msgModel.text, msgModel.width, msgModel)

  // center the text in message container
  tAttrs.x = fromBound + msgModel.width / 2
  tAttrs.y = starty + conf.boxMargin
  tAttrs.width = msgModel.width
  tAttrs.text = text
  tAttrs.fontFamily = conf.messageFontFamily
  tAttrs.fontSize = conf.messageFontSize
  tAttrs.fontWeight = conf.messageFontWeight
  // tAttrs.textMargin = conf.wrapPadding

  let totalOffset = textDims.height
  let lineStarty
  const lineAttrs: Partial<Line['attrs']> = {
    stroke: conf.messageTextColor,
    lineWidth: 2,
  }
  const { verticalPos } = model

  let lineMark
  if (startx === stopx) {
    lineStarty = model.verticalPos + totalOffset
    totalOffset += conf.boxMargin

    lineStarty = model.verticalPos + totalOffset
    const lineEndy = lineStarty + 20

    const linePath =
      'M ' +
      startx +
      ',' +
      lineStarty +
      ' C ' +
      (startx + 60) +
      ',' +
      (lineStarty - 10) +
      ' ' +
      (startx + 60) +
      ',' +
      (lineStarty + 30) +
      ' ' +
      startx +
      ',' +
      lineEndy

    safeAssign(lineAttrs, {
      path: linePath,
      x1: startx,
      x2: stopx,
      y2: lineEndy,
    })
    lineMark = makeMark('path', lineAttrs as any, { class: 'message__line', itemId })

    safeAssign(tAttrs, {
      x: startx,
    })

    const offsetBump = 20
    totalOffset += offsetBump
    const dx = Math.max(textDims.width / 2, conf.actorWidth / 2)
    model.insert(startx - dx, verticalPos - 10 + totalOffset, stopx + dx, verticalPos + offsetBump + totalOffset)
  } else {
    // totalOffset += conf.boxMrgin
    lineStarty = verticalPos + totalOffset
    safeAssign(lineAttrs, {
      x1: startx,
      x2: stopx,
      y1: lineStarty,
      y2: lineStarty,
    })
    lineMark = {
      type: 'line',
      attrs: lineAttrs,
      class: 'message__line',
      itemId,
    }
    model.insert(startx, lineStarty - 10, stopx, lineStarty)
  }

  // line type
  if (
    type === LINETYPE.DOTTED ||
    type === LINETYPE.DOTTED_CROSS ||
    type === LINETYPE.DOTTED_POINT ||
    type === LINETYPE.DOTTED_OPEN
  ) {
    safeAssign(lineAttrs, {
      lineDash: [3, 3],
    })
  }

  const isRightArrow = stopx > startx
  const arrowRad = isRightArrow ? 0 : -Math.PI
  let lineEndMark: Path = null

  let lineEndHalfH = 0

  if (type === LINETYPE.SOLID || type === LINETYPE.DOTTED) {
    const side = 10
    lineEndMark = drawArrowTo({ x: lineAttrs.x2, y: lineAttrs.y2 }, side, arrowRad, {
      type: 'triangle',
      color: lineAttrs.stroke,
    })
    lineEndHalfH = side / 2
  }

  if (type === LINETYPE.SOLID_CROSS || type === LINETYPE.DOTTED_CROSS) {
    const crossOffset = 5
    const arrowHeight = 10
    const crossCenterX = lineAttrs.x2 + crossOffset * (isRightArrow ? -1 : 1)
    lineEndMark = drawCrossTo({ x: crossCenterX, y: lineAttrs.y2 }, arrowHeight, arrowRad, {
      stroke: lineAttrs.stroke,
      lineWidth: 2,
    })
    lineAttrs.x2 += isRightArrow ? -crossOffset : crossOffset
    lineEndHalfH = arrowHeight / 2
  }

  let numberMark: Group
  // add node number
  if (db.showSequenceNumbers || conf.showSequenceNumbers) {
    // sequence circle and text is the reversed version of actorStyle
    const numberTextMark = makeMark(
      'text',
      {
        ...getBaseText(),
        text: sequenceIndex.toString(),
        x: startx,
        y: lineStarty,
        textAlign: 'center',
        textBaseline: 'middle',
        fill: conf.actorBackground,
        fontWeight: 'bold',
      },
      { class: 'sequence-number' },
    )
    const circleColor = conf.actorBorderColor
    const circleMark = makeMark('marker', {
      symbol: 'circle',
      x: startx,
      y: lineStarty,
      r: SHOW_NUMBER_CIRCLE_RADIUS,
      fill: circleColor,
      stroke: circleColor,
    })
    numberMark = makeMark(
      'group',
      {},
      {
        children: [circleMark, numberTextMark],
      },
    )
  }
  // console.log('bumpVerticalPos , totalOffset', totalOffset)
  model.bumpVerticalPos(totalOffset, { extraMarginForBox: lineEndHalfH })
  msgModel.height += totalOffset
  msgModel.stopy = msgModel.starty + msgModel.height
  model.insert(msgModel.fromBound, msgModel.starty, msgModel.toBound, msgModel.stopy)

  return {
    mark: {
      type: 'group',
      class: 'message',
      itemId,
      children: compact([
        lineMark,
        lineEndMark,
        {
          type: 'text',
          attrs: tAttrs,
          class: 'message__text',
        },
        numberMark,
      ]),
    },
  }
}

/**
 * Draws an note in the diagram with the attached line
 * @param noteModel:{x: number, y: number, message: string, width: number} - startx: x axis start position, verticalPos: y axis position, messsage: the message to be shown, width: Set this with a custom width to override the default configured width.
 */
const drawNoteTo = function (noteModel: NoteModel, container: Group) {
  model.bumpVerticalPos(conf.boxMargin)

  const textDims = calculateTextDimensions(noteModel.text, noteFont(conf))
  const textHeight = textDims.height
  noteModel.height = textHeight + 2 * conf.noteMargin
  noteModel.starty = model.verticalPos
  const rectAttrs = getBaseNote(theme)
  safeAssign(rectAttrs, {
    x: noteModel.startx,
    y: noteModel.starty,
    width: noteModel.width || conf.noteWidth,
    height: noteModel.height,
  })
  const noteRect: Rect = {
    type: 'rect',
    class: 'note__bg',
    attrs: rectAttrs,
  }

  const textAttrs: Text['attrs'] = { fill: conf.noteTextColor, text: noteModel.text, ...(noteFont(conf) as any) }
  safeAssign(textAttrs, {
    x: noteModel.startx + noteModel.width / 2,
    y: noteModel.starty + noteModel.height / 2,
    width: noteModel.width,
    textAlign: 'center',
    textBaseline: 'middle',
  })

  const textMark: Text = {
    type: 'text',
    attrs: textAttrs,
  }

  model.bumpVerticalPos(textHeight + 2 * conf.noteMargin)
  noteModel.stopy = noteModel.starty + textHeight + 2 * conf.noteMargin
  noteModel.stopx = noteModel.startx + rectAttrs.width
  model.insert(noteModel.startx, noteModel.starty, noteModel.stopx, noteModel.stopy)
  const mark: Group = {
    type: 'group',
    class: 'note',
    children: [noteRect, textMark],
  }
  container.children.push(mark)
}

type DrawActorsOptions = {
  verticalPos?: number
  isMirror?: boolean
}

export const drawActors = function (rootMark: Group, ir: SequenceDiagramIR, opts: DrawActorsOptions) {
  // Draw the actors
  const { verticalPos = 0, isMirror } = opts
  let actorKeys = ir.actorOrder

  const boxIds = Object.keys(ir.participantBoxes)

  actorKeys = actorKeys.sort((a, b) => {
    // actors not in boxes should come after those in boxes
    let aOrder = 1000
    let bOrder = 1000
    const actorA = ir.actors[a]
    const actorB = ir.actors[b]
    if (actorA.boxId) {
      aOrder = boxIds.indexOf(actorA.boxId)
    }
    if (actorB.boxId) {
      bOrder = boxIds.indexOf(actorB.boxId)
    }
    return aOrder - bOrder
  })

  let nextActorX = 0

  for (let i = 0; i < actorKeys.length; i++) {
    const key = actorKeys[i]
    const actor = ir.actors[key]
    const attrsKey = isMirror ? `${key}_mirror` : key
    const { boxId } = actor

    const boxInfo = model.getBoxInfo(boxId)
    const participantBox = boxInfo?.participantBox
    const actorMark: Group = {
      type: 'group',
      class: 'actor',
      children: [],
      itemId: actor.itemId,
    }

    let attrs: Rect['attrs']
    if (isMirror) {
      attrs = { ...model.actorAttrsMap.get(key) }
    } else {
      attrs = model.actorAttrsMap.get(key) || { fill: conf.actorBackground, stroke: conf.actorBorderColor }
    }

    const areaWidth = attrs.width || conf.actorWidth
    const areaHeight = Math.max(attrs.height || 0, model.actorHeight)

    let actorX = nextActorX
    if (participantBox && participantBox.actors[0] === key) {
      actorX += conf.participantBoxPadding
    }
    safeAssign(attrs, {
      width: areaWidth,
      height: areaHeight,
      margin: attrs.margin || conf.actorMargin,
      x: actorX,
      y: verticalPos,
      radius: 4,
    })
    const actorCenter: Point = { x: attrs.x + attrs.width / 2, y: attrs.y + attrs.height / 2 }
    const labelFontFonfig = actorFont(conf)
    const textAttrs: Text['attrs'] = {
      fill: conf.actorTextColor,
      text: actor.description,
      x: actorCenter.x,
      y: actorCenter.y,
      textAlign: 'center',
      textBaseline: 'middle',
      ...labelFontFonfig,
    }
    const labelDims = calculateTextDimensions(actor.description, labelFontFonfig)

    let lineStartOffsetY = 0
    let sym: GSymbol
    if (actor.classifier && symbolRegistry.get(actor.classifier)) {
      const symbolHeight = areaHeight - labelDims.height
      const contentArea: ContentArea = {
        x: attrs.x + areaWidth / 2,
        y: attrs.y + (areaHeight - labelDims.height) / 2,
        width: clamp(symbolHeight * 1.4, areaWidth / 2, areaWidth),
        height: symbolHeight,
      }
      lineStartOffsetY += labelDims.height / 2

      sym = symbolRegistry.create(actor.classifier, {
        mode: 'icon',
        attrs: {
          stroke: attrs.stroke,
          fill: attrs.fill,
        },
        contentArea,
      })
      if (sym) {
        textAttrs.y = actorCenter.y + (areaHeight - labelDims.height) / 2 + 4
        actorMark.children.push(sym)
      }
    }
    if (!sym) {
      // console.log('drawActors', attrsKey, verticalPos, 'attrs', attrs)
      actorMark.children.push({
        type: 'rect',
        attrs: attrs,
      })
    }

    actorMark.children.push({
      type: 'text',
      attrs: textAttrs,
    })

    // Draw the attached line
    let lineMark: Line
    if (!isMirror) {
      lineMark = {
        type: 'line',
        class: 'actor__line',
        attrs: {
          x1: actorCenter.x,
          x2: actorCenter.x,
          y1: attrs.y + areaHeight + lineStartOffsetY,
          y2: 2000,
          stroke: conf.actorLineColor,
        },
      }
      model.actorLineMarkMap.set(key, lineMark)
    } else {
      const prevLineMark = model.actorLineMarkMap.get(key)
      if (prevLineMark) {
        prevLineMark.attrs.y2 = attrs.y
      }
    }
    if (lineMark) {
      actorMark.children.unshift(lineMark)
    }

    model.insert(attrs.x, verticalPos, attrs.x + attrs.width, attrs.height)

    nextActorX = actorX + attrs.width + attrs.margin

    if (participantBox && participantBox.actors.indexOf(key) === participantBox.actors.length - 1) {
      nextActorX += conf.participantBoxPadding
    }
    // console.log('actorMark', attrsKey, actorMark)

    rootMark.children.push(actorMark)
    model.actorAttrsMap.set(attrsKey, attrs)

    if (boxInfo) {
      boxInfo.actorMarks.push(actorMark)
      const newBound = makeBounds()
      newBound.left = attrs.x
      newBound.right = attrs.x + attrs.width
      newBound.top = 0
      tryExpandBounds(boxInfo.bounds, newBound)
    }
  }

  // Add a margin between the actor boxes and the first arrow
  model.bumpVerticalPos(model.actorHeight)
}

function drawParticipantBoxes(context: SequenceArtistContext) {
  const { model, rootMark, conf } = context

  if (!model.hasParticipantBox()) return

  const boxesGroup = makeEmptyGroup()
  boxesGroup.class = 'sequence__participant-boxes'
  const padding = conf.participantBoxPadding
  rootMark.children.unshift(boxesGroup)
  const modelBounds = model.getBounds()
  for (const boxInfo of model.boxInfos.values()) {
    const { participantBox, bounds, textDims } = boxInfo
    const width = Math.max(textDims.width, bounds.width) + padding * 2
    if (!isFinite(width)) continue
    const startx = bounds.left - padding
    const rect = makeMark('rect', {
      x: startx,
      y: 0,
      width,
      height: modelBounds.stopy - modelBounds.starty,
      fill: participantBox.background || conf.participantBackground,
      stroke: conf.actorTextColor,
    })
    boxesGroup.children.push(rect)
    if (participantBox.text) {
      const fontConfig = messageFont(conf)
      const textMark = makeMark('text', {
        text: participantBox.text,
        x: startx + width / 2,
        y: conf.participantBoxPadding,
        textBaseline: 'top',
        textAlign: 'center',
        fill: conf.actorTextColor,
        ...fontConfig,
        fontWeight: 'bold',
      })
      boxesGroup.children.push(textMark)
    }
    model.insert(startx, 0, startx + width, rect.attrs.height)
  }
}

function drawActivationTo(mark: Group, data: ActivationData) {
  const rectAttrs = getBaseNote(theme)
  safeAssign(rectAttrs, {
    x: data.startx,
    y: data.starty,
    width: data.stopx - data.startx,
    height: model.verticalPos - data.starty,
    fill: conf.activationBackground,
  })
  const rect: Rect = {
    type: 'rect',
    class: 'activation',
    attrs: rectAttrs,
  }
  mark.children.push(rect)
}

/**
 * Retrieves the max message width of each actor, supports signals (messages, loops)
 * and notes.
 *
 * It will enumerate each given message, and will determine its text width, in relation
 * to the actor it originates from, and destined to.
 */
const getMaxMessageWidthPerActor = function (ir: SequenceDiagramIR) {
  const { actors, messages } = ir
  const maxMessageWidthPerActor: Record<string, number> = {}

  messages.forEach(function (msg) {
    if (actors[msg.to] && actors[msg.from]) {
      const actor = actors[msg.to]
      const { prevActorId, nextActorId } = actor

      // If this is the first actor, and the message is left of it, no need to calculate the margin
      if (msg.placement === PLACEMENT.LEFTOF && !prevActorId) {
        return
      }

      // If this is the last actor, and the message is right of it, no need to calculate the margin
      if (msg.placement === PLACEMENT.RIGHTOF && !actor.nextActorId) {
        return
      }

      const isNote = msg.placement !== undefined
      const isMessage = !isNote

      const textFont = isNote ? noteFont(conf) : messageFont(conf)
      const wrappedMessage = msg.text
      // TODO: wrap
      // let wrappedMessage = msg.wrap
      //   ? utils.wrapLabel(msg.message, conf.width - 2 * conf.wrapPadding, textFont)
      //   : msg.message;
      const messageDimensions = calculateTextDimensions(wrappedMessage, textFont)
      const messageWidth = messageDimensions.width + 2 * conf.wrapPadding

      /*
       * The following scenarios should be supported:
       *
       * - There's a message (non-note) between fromActor and toActor
       *   - If fromActor is on the right and toActor is on the left, we should
       *     define the toActor's margin
       *   - If fromActor is on the left and toActor is on the right, we should
       *     define the fromActor's margin
       * - There's a note, in which case fromActor == toActor
       *   - If the note is to the left of the actor, we should define the previous actor
       *     margin
       *   - If the note is on the actor, we should define both the previous and next actor
       *     margins, each being the half of the note size
       *   - If the note is on the right of the actor, we should define the current actor
       *     margin
       */
      if (isMessage && msg.from === nextActorId) {
        maxMessageWidthPerActor[msg.to] = Math.max(maxMessageWidthPerActor[msg.to] || 0, messageWidth)
      } else if (isMessage && msg.from === prevActorId) {
        maxMessageWidthPerActor[msg.from] = Math.max(maxMessageWidthPerActor[msg.from] || 0, messageWidth)
      } else if (isMessage && msg.from === msg.to) {
        maxMessageWidthPerActor[msg.from] = Math.max(maxMessageWidthPerActor[msg.from] || 0, messageWidth / 2)

        maxMessageWidthPerActor[msg.to] = Math.max(maxMessageWidthPerActor[msg.to] || 0, messageWidth / 2)
      } else if (msg.placement === PLACEMENT.RIGHTOF) {
        maxMessageWidthPerActor[msg.from] = Math.max(maxMessageWidthPerActor[msg.from] || 0, messageWidth)
      } else if (msg.placement === PLACEMENT.LEFTOF) {
        maxMessageWidthPerActor[prevActorId] = Math.max(maxMessageWidthPerActor[prevActorId] || 0, messageWidth)
      } else if (msg.placement === PLACEMENT.OVER) {
        if (prevActorId) {
          maxMessageWidthPerActor[prevActorId] = Math.max(maxMessageWidthPerActor[prevActorId] || 0, messageWidth / 2)
        }

        if (nextActorId) {
          maxMessageWidthPerActor[msg.from] = Math.max(maxMessageWidthPerActor[msg.from] || 0, messageWidth / 2)
        }
      }
    }
  })

  // logger.debug('maxMessageWidthPerActor:', maxMessageWidthPerActor)
  return maxMessageWidthPerActor
}

/**
 * This will calculate the optimal margin for each given actor, for a given
 * actor->messageWidth map.
 *
 * An actor's margin is determined by the width of the actor, the width of the
 * largest message that originates from it, and the configured conf.actorMargin.
 *
 * @param context
 * @param actorToMessageWidth - A map of actor key -> max message width it holds
 */
const calculateActorMargins = function (context: SequenceArtistContext, actorToMessageWidth: Record<string, number>) {
  const { ir, model } = context
  const { actors } = ir
  let maxHeight = 0
  Object.keys(actors).forEach(prop => {
    const actorAttrs = model.actorAttrsMap.get(prop) || {}
    const actor = actors[prop]
    // if (actor.wrap) {
    //   actor.description = utils.wrapLabel(
    //     actor.description,
    //     conf.width - 2 * conf.wrapPadding,
    //     actorFont(conf)
    //   );
    // }
    const actDims = calculateTextDimensions(actor.description, actorFont(conf))
    actorAttrs.width = actor.wrap ? conf.actorWidth : Math.max(conf.actorWidth, actDims.width + 2 * conf.wrapPadding)

    actorAttrs.height = actor.wrap ? Math.max(actDims.height, conf.actorHeight) : conf.actorHeight
    maxHeight = Math.max(maxHeight, actorAttrs.height)
  })

  for (const actorKey in actorToMessageWidth) {
    const actor = actors[actorKey]
    const actorAttrs = model.actorAttrsMap.get(actorKey)

    if (!actor) {
      continue
    }

    const nextActorAttrs = model.actorAttrsMap.get(actor.nextActorId)

    // No need to space out an actor that doesn't have a next link
    if (!nextActorAttrs) {
      continue
    }

    const messageWidth = actorToMessageWidth[actorKey]
    const actorWidth = messageWidth + conf.actorMargin - actorAttrs.width / 2 - nextActorAttrs.width / 2

    actorAttrs.margin = Math.max(actorWidth, conf.actorMargin)
  }

  return {
    actorHeight: Math.max(maxHeight, conf.actorHeight),
  }
}

const buildMessageModel = function (msg: Message): MessageModel {
  const msgDims = calculateTextDimensions(msg.text, messageFont(conf))
  let process = false
  if (
    [
      LINETYPE.SOLID_OPEN,
      LINETYPE.DOTTED_OPEN,
      LINETYPE.SOLID,
      LINETYPE.DOTTED,
      LINETYPE.SOLID_CROSS,
      LINETYPE.DOTTED_CROSS,
      LINETYPE.SOLID_POINT,
      LINETYPE.DOTTED_POINT,
    ].includes(msg.type)
  ) {
    process = true
  }
  if (!process) {
    return {
      width: msgDims.width,
      height: msgDims.height,
      startx: 0,
      starty: 0,
      text: msg.text,
      type: msg.type,
      stopx: msgDims.width,
      stopy: msgDims.height,
      itemId: msg.itemId,
    }
  }
  const fromBound = activationBounds(msg.from)
  const toBound = activationBounds(msg.to)
  const fromIdx = fromBound[0] <= toBound[0] ? 1 : 0
  const toIdx = fromBound[0] < toBound[0] ? 0 : 1
  const allBounds = fromBound.concat(toBound)
  const boundedWidth = Math.abs(toBound[toIdx] - fromBound[fromIdx])
  // if (msg.wrap && msgModel.text) {
  //   msgModel.msgModel = utils.wrapLabel(
  //     msg.text,
  //     Math.max(boundedWidth + 2 * conf.wrapPadding, conf.width),
  //     messageFont(conf),
  //   )
  // }

  return {
    width: Math.max(
      msg.wrap ? 0 : msgDims.width + 2 * conf.wrapPadding,
      boundedWidth + 2 * conf.wrapPadding,
      conf.actorWidth,
    ),
    height: 0,
    startx: fromBound[fromIdx],
    stopx: toBound[toIdx],
    starty: 0,
    stopy: 0,
    text: msg.text,
    type: msg.type,
    wrap: msg.wrap,
    fromBound: Math.min.apply(null, allBounds),
    toBound: Math.max.apply(null, allBounds),
    attrs: msg.attrs,
    itemId: msg.itemId,
  } as MessageModel
}

type NoteModel = {
  width: number
  height: number
  startx: number
  stopx: number
  starty: number
  stopy: number
  text: Message['text']
  // type: Message['type']
  sequenceIndex?: number
  fromBound?: number
  toBound?: number
}

const buildNoteModel = function (msg: Message) {
  // console.log('build note model', msg)
  const fromActorAttr = model.actorAttrsMap.get(msg.from)
  const toActorAttr = model.actorAttrsMap.get(msg.to)

  const startx = fromActorAttr.x
  const stopx = toActorAttr.x
  const shouldWrap = msg.wrap && msg.text

  // let textDimensions = calculateTextDimensions(
  //   shouldWrap ? utils.wrapLabel(msg.message, conf.width, noteFont(conf)) : msg.message,
  //   noteFont(conf)
  // );
  let textDimensions = calculateTextDimensions(msg.text, noteFont(conf))
  // console.log('build note model, textDims', textDimensions)
  const noteModel: NoteModel = {
    width: shouldWrap ? conf.noteWidth : Math.max(conf.noteWidth, textDimensions.width + 2 * conf.noteMargin),
    height: 0,
    startx: fromActorAttr.x,
    stopx: 0,
    starty: 0,
    stopy: 0,
    text: msg.text,
  }
  if (msg.placement === PLACEMENT.RIGHTOF) {
    noteModel.width = shouldWrap
      ? Math.max(conf.noteWidth, textDimensions.width)
      : Math.max(fromActorAttr.width / 2 + toActorAttr.width / 2, textDimensions.width + 2 * conf.noteMargin)
    noteModel.startx = startx + (fromActorAttr.width + conf.actorMargin) / 2
  } else if (msg.placement === PLACEMENT.LEFTOF) {
    noteModel.width = shouldWrap
      ? Math.max(conf.noteWidth, textDimensions.width + 2 * conf.noteMargin)
      : Math.max(fromActorAttr.width / 2 + toActorAttr.width / 2, textDimensions.width + 2 * conf.noteMargin)
    noteModel.startx = startx - noteModel.width + (fromActorAttr.width - conf.actorMargin) / 2
  } else if (msg.to === msg.from) {
    textDimensions = calculateTextDimensions(
      // shouldWrap
      //   ? utils.wrapLabel(msg.text, Math.max(conf.noteWidth, actors[msg.from].width), noteFont(conf))
      //   : msg.text,
      msg.text,
      noteFont(conf),
    )
    noteModel.width = shouldWrap
      ? Math.max(conf.noteWidth, fromActorAttr.width)
      : Math.max(fromActorAttr.width, conf.noteWidth, textDimensions.width + 2 * conf.noteMargin)
    noteModel.startx = startx + (fromActorAttr.width - noteModel.width) / 2
  } else {
    noteModel.width = Math.abs(startx + fromActorAttr.width / 2 - (stopx + toActorAttr.width / 2)) + conf.actorMargin
    noteModel.startx =
      startx < stopx
        ? startx + fromActorAttr.width / 2 - conf.actorMargin / 2
        : stopx + toActorAttr.width / 2 - conf.actorMargin / 2
  }
  // TODO: wrap
  // if (shouldWrap) {
  //   noteModel.message = utils.wrapLabel(
  //     msg.message,
  //     noteModel.width - 2 * conf.wrapPadding,
  //     noteFont(conf)
  //   );
  // }
  logger.debug(
    `NM:[${noteModel.startx},${noteModel.stopx},${noteModel.starty},${noteModel.stopy}:${noteModel.width},${noteModel.height}=${msg.text}]`,
  )
  return noteModel
}

function calcLoopMinWidths(messages: Message[]) {
  const minWidths = {}
  const messageFontConfig = messageFont(conf)
  messages.forEach(msg => {
    switch (msg.type) {
      case LINETYPE.LOOP_START:
      case LINETYPE.ALT_START:
      case LINETYPE.OPT_START:
      case LINETYPE.PAR_START:
        if (!msg.id) msg.id = makeid(10)
        const label = GROUP_LABEL_MAP[msg.type]
        const labelWidth = label ? calculateTextDimensions(label, messageFontConfig).width : conf.labelBoxWidth
        const titleWidth = calculateTextDimensions(msg.text, messageFontConfig).width
        minWidths[msg.id] = labelWidth + titleWidth + 2 * conf.boxTextMargin
        break
    }
  })
  model.loopMinWidths = minWidths
}

type GroupBoundInfo = {
  id: string
  msg: string
  from: number
  to: number
  width: number
}

const calculateLoopBounds = function (messages: Message[]) {
  const loops: Record<string, GroupBoundInfo> = {}
  const stack: GroupBoundInfo[] = [] // loop stack
  let current: GroupBoundInfo
  let noteModel
  let msgModel: MessageModel

  messages.forEach(function (msg) {
    if (!msg.id) msg.id = makeid(10)
    switch (msg.type) {
      case LINETYPE.LOOP_START:
      case LINETYPE.ALT_START:
      case LINETYPE.OPT_START:
      case LINETYPE.PAR_START:
        const minWidth = model.loopMinWidths[msg.id] || 0
        stack.push({
          id: msg.id,
          msg: msg.text,
          from: Number.MAX_SAFE_INTEGER,
          to: Number.MIN_SAFE_INTEGER,
          width: minWidth,
        })
        break
      case LINETYPE.ALT_ELSE:
      case LINETYPE.PAR_AND:
        if (msg.text) {
          current = stack[stack.length - 1]
          loops[current.id] = current
          loops[msg.id] = current
        }
        break
      case LINETYPE.LOOP_END:
      case LINETYPE.ALT_END:
      case LINETYPE.OPT_END:
      case LINETYPE.PAR_END:
        current = stack.pop()
        loops[current.id] = current
        break
      case LINETYPE.ACTIVE_START:
        {
          const actorName = msg.from || msg.to
          const actorRect = model.actorAttrsMap.get(actorName)
          const stackedSize = actorActivations(msg.from ? msg.from : msg.to).length
          // console.log('statcked size', stackedSize)
          const x = actorRect.x + actorRect.width / 2 + ((stackedSize - 1) * conf.activationWidth) / 2
          const toAdd = {
            startx: x,
            stopx: x + conf.activationWidth,
            actor: msg.from,
            starty: 0,
            stopy: 0,
            enabled: true,
          }
          model.activations.push(toAdd)
        }
        break
      case LINETYPE.ACTIVE_END:
        {
          const lastActorActivationIdx = model.activations.map(a => a.actor).lastIndexOf(msg.from)
          delete model.activations.splice(lastActorActivationIdx, 1)[0]
        }
        break
    }
    const isNote = msg.placement !== undefined
    if (isNote) {
      noteModel = buildNoteModel(msg)
      model.noteModelMap.set(msg.id, noteModel)
      stack.forEach(stk => {
        current = stk
        current.from = Math.min(current.from, noteModel.startx)
        current.to = Math.max(current.to, noteModel.startx + noteModel.width)
        current.width = Math.max(current.width, Math.abs(current.from - current.to)) - conf.labelBoxWidth
      })
    } else if (msg.type === LINETYPE.DIVIDER) {
      const dividerModel = buildMessageModel(msg)
      model.dividerMap.set(msg.id, dividerModel)
    } else {
      msgModel = buildMessageModel(msg)
      model.msgModelMap.set(msg.id, msgModel)

      if (msgModel.startx && msgModel.stopx && stack.length > 0) {
        const isZeroWidth = msgModel.startx === msgModel.stopx
        stack.forEach(stk => {
          current = stk
          if (isZeroWidth) {
            const from = model.actorAttrsMap.get(msg.from)
            const to = model.actorAttrsMap.get(msg.to)
            current.from = Math.min(from.x - msgModel.width / 2, from.x - from.width / 2, current.from)
            current.to = Math.max(to.x + msgModel.width / 2, to.x + from.width / 2, current.to)
            current.width = Math.max(current.width, Math.abs(current.to - current.from)) - conf.labelBoxWidth
          } else {
            current.from = Math.min(msgModel.startx, current.from)
            current.width = Math.max(current.width, msgModel.width)
            current.to = Math.max(msgModel.stopx, current.to, current.from + current.width)
          }
        })
      }
    }
  })
  logger.debug('Loop type widths:', loops)
  return loops
}

export default sequenceArtist
