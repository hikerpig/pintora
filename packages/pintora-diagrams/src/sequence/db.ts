import { logger, makeIdCounter, OrNull, parseColor } from '@pintora/core'
import { ConfigParam, OverrideConfigAction, ParamAction } from '../util/config'
import { BaseDb } from '../util/base-db'
import { BaseDiagramIR } from '../util/ir'

export interface WrappedText {
  text: string
  wrap: boolean
}

type ParsedDescription = WrappedText

export enum LINETYPE {
  SOLID = 0,
  DOTTED = 1,
  NOTE = 2,
  SOLID_CROSS = 3,
  DOTTED_CROSS = 4,
  SOLID_OPEN = 5,
  DOTTED_OPEN = 6,
  LOOP_START = 10,
  LOOP_END = 11,
  ALT_START = 12,
  ALT_ELSE = 13,
  ALT_END = 14,
  OPT_START = 15,
  OPT_END = 16,
  ACTIVE_START = 17,
  ACTIVE_END = 18,
  PAR_START = 19,
  PAR_AND = 20,
  PAR_END = 21,
  RECT_START = 22,
  RECT_END = 23,
  SOLID_POINT = 24,
  DOTTED_POINT = 25,
  DIVIDER = 26,
}

export const ARROWTYPE = {
  FILLED: 0,
  OPEN: 1,
}

export enum PLACEMENT {
  LEFTOF = 0,
  RIGHTOF = 1,
  OVER = 2,
}

export type Actor = {
  name: string
  itemId: string
  description: string
  wrap: boolean
  classifier?: string
  prevActorId?: OrNull<string>
  nextActorId?: OrNull<string>
  boxId?: string
}

export interface Message extends WrappedText {
  from: string
  to: string
  text: string
  wrap: any
  id?: string
  itemId: string
  type?: LINETYPE
  placement?: any
  attrs?: GroupAttrs
}

export interface Note extends WrappedText {
  actor: string | string[]
  placement: any
}

const GROUP_TYPE_CONFIGS: Record<string, { startSignalType: LINETYPE; endSignalType: LINETYPE }> = {
  loop: { startSignalType: LINETYPE.LOOP_START, endSignalType: LINETYPE.LOOP_END },
  par: { startSignalType: LINETYPE.PAR_START, endSignalType: LINETYPE.PAR_END },
  opt: { startSignalType: LINETYPE.OPT_START, endSignalType: LINETYPE.OPT_END },
  alt: { startSignalType: LINETYPE.ALT_START, endSignalType: LINETYPE.ALT_END },
  else: { startSignalType: LINETYPE.ALT_ELSE, endSignalType: LINETYPE.ALT_END },
  and: { startSignalType: LINETYPE.PAR_AND, endSignalType: LINETYPE.PAR_END },
}

export type GroupAttrs = {
  background: string | null
}

export type ParticipantBox = {
  actors: string[]
  id: string
  text: string | null
  background: string | null
}

export type SequenceDiagramIR = BaseDiagramIR & {
  messages: Message[]
  notes: Note[]
  actors: { [key: string]: Actor }
  participantBoxes: { [key: string]: ParticipantBox }
  title: string
  showSequenceNumbers: boolean
  // titleWrapped: boolean
}

class SequenceDB extends BaseDb {
  prevActorId: string | null = null
  messages: Message[] = []
  notes: Note[] = []
  actors: { [key: string]: Actor } = {}
  participantBoxes: { [key: string]: ParticipantBox } = {}
  title = ''
  titleWrapped = false
  wrapEnabled = false
  showSequenceNumbers = false

  protected idCounter = makeIdCounter()

  addActor(param: AddActorParam) {
    const { actor: name, classifier } = param
    let { description } = param
    const id = name
    // Don't allow description nulling
    const old = this.actors[id]
    if (old && name === old.name && description == null) return

    // Don't allow null descriptions, either
    if (description == null || description.text == null) {
      description = { text: name, wrap: false }
    }

    this.actors[id] = {
      name: name,
      description: description.text,
      wrap: (description.wrap === undefined && this.wrapEnabled) || !!description.wrap,
      prevActorId: this.prevActorId,
      classifier,
      itemId: `actor-${id}`,
    }
    if (this.prevActorId && this.actors[this.prevActorId]) {
      this.actors[this.prevActorId].nextActorId = id
    }

    this.prevActorId = id
  }

  addSignal(
    from: { actor: string } | string,
    to: { actor: string } | string,
    message: WrappedText = { text: '', wrap: false },
    messageType: LINETYPE,
  ) {
    if (typeof from === 'string') {
      from = { actor: from }
    }
    if (typeof to === 'string') {
      to = { actor: to }
    }
    if (messageType === LINETYPE.ACTIVE_END) {
      const cnt = activationCount(this, from.actor)
      if (cnt < 1) {
        // Bail out as there is an activation signal from an inactive participant
        const error = new SError('Trying to inactivate an inactive participant (' + from.actor + ')')
        error.hash = {
          text: '->>-',
          token: '->>-',
          line: '1',
          loc: { first_line: 1, last_line: 1, first_column: 1, last_column: 1 },
          expected: ["'ACTIVE_PARTICIPANT'"],
        }
        throw error
      }
    }
    const msgIndex = this.messages.length
    this.messages.push({
      from: from.actor,
      to: to ? to.actor : '',
      text: message.text || '',
      wrap: (message.wrap === undefined && this.wrapEnabled) || !!message.wrap,
      type: messageType,
      itemId: `message-${msgIndex}-${messageType}`,
    })
    return true
  }

  addSignalWithoutActor(message: WrappedText = { text: '', wrap: false }, messageType: LINETYPE, attrs?: GroupAttrs) {
    const msgIndex = this.messages.length
    this.messages.push({
      from: undefined,
      to: undefined,
      text: message.text || '',
      wrap: (message.wrap === undefined && this.wrapEnabled) || !!message.wrap,
      type: messageType,
      attrs,
      itemId: `message-${msgIndex}-${messageType}`,
    })
  }

  addGroupStart(groupType: string, text: WrappedText, attrs: GroupAttrs) {
    const groupConfig = GROUP_TYPE_CONFIGS[groupType]
    if (!groupConfig) return
    if (attrs.background) {
      attrs.background = parseColor(attrs.background).color
    }
    this.addSignalWithoutActor(text, groupConfig.startSignalType, attrs)
  }

  addGroupEnd(groupType: string) {
    const groupConfig = GROUP_TYPE_CONFIGS[groupType]
    if (!groupConfig) return
    this.addSignalWithoutActor(undefined, groupConfig.endSignalType)
  }

  addNote(actor: string | string[], placement: any, message: ParsedDescription) {
    const note: Note = {
      actor: actor,
      placement,
      text: message.text,
      wrap: (message.wrap === undefined && this.wrapEnabled) || !!message.wrap,
    }

    const fromActor = Array.isArray(actor) ? actor[0] : actor
    const toActor = Array.isArray(actor) ? actor[1] : actor

    this.notes.push(note)

    const msgIndex = this.messages.length
    this.messages.push({
      from: fromActor,
      to: toActor,
      text: message.text,
      wrap: (message.wrap === undefined && this.wrapEnabled) || !!message.wrap,
      type: LINETYPE.NOTE,
      placement: placement,
      itemId: `message-${msgIndex}-${LINETYPE.NOTE}`,
    })
    // console.log('addNote, message', actor, this.messages[this.messages.length - 1])
  }

  setTitle(titleWrap: WrappedText) {
    this.title = titleWrap.text
    this.titleWrapped = (titleWrap.wrap === undefined && this.wrapEnabled) || !!titleWrap.wrap
  }

  parseMessage(str: string) {
    const _str = str.trim()
    const message = {
      text: _str.replace(/\\n/, '\n'),
      wrap: false,
    }
    logger.debug('parseMessage:', message)
    return message
  }

  addParam(sp: ConfigParam) {
    this.configParams.push(sp)
  }

  addBox(param: ActionPayloadMap['addBox']) {
    this.apply(param.children)
    const participantBox: ParticipantBox = {
      actors: [],
      text: param.text,
      id: this.idCounter.next(),
      background: param.background,
    }
    param.children.forEach(childAction => {
      if (childAction.type === 'addActor') {
        participantBox.actors.push(childAction.actor)
      }
    })
    if (participantBox.actors.length) {
      this.participantBoxes[participantBox.id] = participantBox
    }
  }

  getActor(id: string) {
    return this.actors[id]
  }

  getActorKeys() {
    return Object.keys(this.actors)
  }

  override clear() {
    super.clear()
    this.prevActorId = null
    this.messages = []
    this.notes = []
    this.actors = {}
    this.participantBoxes = {}
    this.title = ''
    this.showSequenceNumbers = false

    this.idCounter.reset()
  }

  prepareBeforeGetIR() {
    for (const box of Object.values(this.participantBoxes)) {
      for (const actorId of box.actors) {
        const actor = this.getActor(actorId)
        if (actor) {
          actor.boxId = box.id
        }
      }
    }
  }

  getDiagramIR(): SequenceDiagramIR {
    this.prepareBeforeGetIR()
    return {
      messages: this.messages,
      notes: this.notes,
      actors: this.actors,
      participantBoxes: this.participantBoxes,
      title: this.title,
      showSequenceNumbers: this.showSequenceNumbers,
      configParams: this.configParams,
      overrideConfig: this.overrideConfig,
    }
  }

  apply(param: ApplyParam | ApplyParam[]) {
    if (!param) return
    if (param instanceof Array) {
      param.forEach(item => {
        this.apply(item)
      })
    } else {
      logger.debug('apply', param)
      switch (param.type) {
        case 'addActor':
          this.addActor(param)
          break
        case 'activeStart':
        case 'activeEnd':
          this.addSignal(param.actor, undefined, undefined, param.signalType)
          break
        case 'addNote':
          this.addNote(param.actor, param.placement, param.text)
          break
        case 'addSignal':
          this.addSignal(param.from, param.to, param.msg, param.signalType)
          break
        case 'groupStart':
          this.addGroupStart(param.groupType, param.text, { background: param.background })
          break
        case 'groupEnd':
          this.addGroupEnd(param.groupType)
          break
        // case 'rectStart':
        //   addSignal(undefined, undefined, param.color, param.signalType)
        //   break
        // case 'rectEnd':
        //   addSignal(undefined, undefined, undefined, param.signalType)
        //   break
        case 'addBox':
          this.addBox(param)
          break
        case 'setTitle':
          this.setTitle(param.text)
          break
        case 'addDivider':
          this.addSignalWithoutActor({ text: param.text, wrap: false }, param.signalType)
          break
        case 'addParam':
          this.addParam({ key: param.key, value: param.value })
          break
        case 'overrideConfig':
          this.addOverrideConfig(param)
          break
      }
    }
  }
}

const db = new SequenceDB()

class SError extends Error {
  hash: any
}

const activationCount = (db: SequenceDB, part: string) => {
  let i
  let count = 0
  for (i = 0; i < db.messages.length; i++) {
    if (db.messages[i].type === LINETYPE.ACTIVE_START) {
      if (db.messages[i].from === part) {
        count++
      }
    }
    if (db.messages[i].type === LINETYPE.ACTIVE_END) {
      if (db.messages[i].from === part) {
        count--
      }
    }
  }
  return count
}

export function enableSequenceNumbers() {
  db.showSequenceNumbers = true
}

type AddActorParam = {
  actor: string
  description: WrappedText
  classifier?: string
}

type ActionPayloadMap = {
  addBox: {
    children: ApplyParam[]
    text: string
    background: string | null
  }
}

/**
 * action param that will be handled by `apply`
 */
export type ApplyParam =
  | ParamAction
  | OverrideConfigAction
  | ({
      type: 'addActor'
    } & AddActorParam)
  | {
      type: 'activeStart' | 'activeEnd'
      actor: { type: string; actor: string }
      signalType: LINETYPE
    }
  | {
      type: 'addNote'
      actor: string | string[]
      placement: PLACEMENT
      text: WrappedText
    }
  | {
      type: 'addSignal'
      from: { actor: string }
      to: { actor: string }
      msg: WrappedText
      signalType: LINETYPE
    }
  | {
      type: 'setTitle'
      text: WrappedText
    }
  | {
      type: 'groupStart'
      groupType: string
      text: WrappedText
      background: string | null
    }
  | {
      type: 'groupEnd'
      groupType: string
    }
  | {
      type: 'addDivider'
      signalType: LINETYPE
      text: string
    }
  | ({ type: 'addBox' } & ActionPayloadMap['addBox'])

export { db }

export default {
  addActor: db.addActor,
  addSignal: db.addSignal,
  enableSequenceNumbers,
  parseMessage: db.parseMessage,
  LINETYPE,
  ARROWTYPE,
  PLACEMENT,
  addNote: db.addNote,
  setTitle: db.setTitle,
  apply: db.apply.bind(db),
}
