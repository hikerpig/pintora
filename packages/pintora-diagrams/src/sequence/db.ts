import { logger } from '@pintora/core'

type OrNull<T> = T | null
type Maybe<T> = T | undefined

interface WrappedText {
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
  description: string
  wrap: boolean
  prevActorId?: OrNull<string>
  nextActorId?: OrNull<string>
}

export interface Message extends WrappedText {
  from: string
  to: string
  text: string
  wrap: any
  answer?: any
  type?: LINETYPE
  placement?: any
}

export interface Note extends WrappedText {
  actor: string
  placement: any
}

type ParsedRelation = {
  actor: string
}

export type SequenceDiagramIR = {
  messages: Message[]
  notes: Note[]
  actors: { [key: string]: Actor }
  title: string
  showSequenceNumbers: boolean
  // titleWrapped: boolean
}

class SequenceDB {
  prevActorId: string | null = null
  messages: Message[] = []
  notes: Note[] = []
  actors: { [key: string]: Actor } = {}
  title = ''
  titleWrapped: boolean = false
  wrapEnabled = false
  showSequenceNumbers = false
  LINETYPE = LINETYPE
  PLACEMENT = PLACEMENT

  addActor(id: string, name: string, description: ParsedDescription) {
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
    }
    if (this.prevActorId && this.actors[this.prevActorId]) {
      this.actors[this.prevActorId].nextActorId = id
    }

    this.prevActorId = id
  }

  addMessage(idFrom: string, idTo: string, message: Message, answer: any) {
    this.messages.push({
      from: idFrom,
      to: idTo,
      text: message.text,
      wrap: (message.wrap === undefined && this.wrapEnabled) || !!message.wrap,
      answer: answer,
    })
  }

  addSignal(
    from: { actor: string },
    to: { actor: string },
    message: WrappedText = { text: '', wrap: false },
    messageType: LINETYPE,
  ) {
    if (messageType === LINETYPE.ACTIVE_END) {
      const cnt = activationCount(this, from.actor)
      if (cnt < 1) {
        // Bail out as there is an activation signal from an inactive participant
        let error = new SError('Trying to inactivate an inactive participant (' + from.actor + ')')
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
    this.messages.push({
      from: from.actor,
      to: to.actor,
      text: message.text || '',
      wrap: (message.wrap === undefined && this.wrapEnabled) || !!message.wrap,
      type: messageType,
    })
    return true
  }

  addNote(actor: string, placement: any, message: ParsedDescription) {
    const note: Note = {
      actor: actor,
      placement,
      text: message.text,
      wrap: (message.wrap === undefined && this.wrapEnabled) || !!message.wrap,
    }

    this.notes.push(note)
    this.messages.push({
      from: actor,
      to: actor,
      text: message.text,
      wrap: (message.wrap === undefined && this.wrapEnabled) || !!message.wrap,
      type: LINETYPE.NOTE,
      placement: placement,
    })
  }

  setTitle(titleWrap: WrappedText) {
    this.title = titleWrap.text
    this.titleWrapped = (titleWrap.wrap === undefined && this.wrapEnabled) || !!titleWrap.wrap
  }

  parseMessage(str: string) {
    const _str = str.trim()
    const message = {
      text: _str.replace(/^[:]?(?:no)?wrap:/, '').trim(),
      wrap: _str.match(/^[:]?wrap:/) !== null ? true : _str.match(/^[:]?nowrap:/) !== null ? false : undefined,
    }
    logger.debug('parseMessage:', message)
    return message
  }

  getActor(id: string) {
    return this.actors[id]
  }

  getActorKeys() {
    return Object.keys(this.actors)
  }

  clear() {
    this.actors = {}
    this.messages = []
  }

  getDiagramIR(): SequenceDiagramIR {
    return {
      messages: this.messages,
      notes: this.notes,
      actors: this.actors,
      title: this.title,
      showSequenceNumbers: this.showSequenceNumbers,
    }
  }

  setWrap(v: boolean) {}

  apply(param: ApplyParam | ApplyParam[]) {
    logger.info('apply', param)
    if (param instanceof Array) {
      param.forEach(item => {
        this.apply(item)
      })
    } else {
      switch (param.type) {
        case 'addActor':
          db.addActor(param.actor, param.actor, param.description)
          break
        case 'activeStart':
        case 'activeEnd':
          db.addSignal(param.actor, undefined, undefined, param.signalType)
          break
        case 'addNote':
          db.addNote(param.actor, param.placement, param.text)
          break
        case 'addMessage':
          db.addSignal(param.from, param.to, param.msg, param.signalType)
          break
        // case 'loopStart':
        //   db.addSignal(undefined, undefined, param.loopText, param.signalType)
        //   break
        // case 'loopEnd':
        //   addSignal(undefined, undefined, undefined, param.signalType)
        //   break
        // case 'rectStart':
        //   addSignal(undefined, undefined, param.color, param.signalType)
        //   break
        // case 'rectEnd':
        //   addSignal(undefined, undefined, undefined, param.signalType)
        //   break
        // case 'optStart':
        //   addSignal(undefined, undefined, param.optText, param.signalType)
        //   break
        // case 'optEnd':
        //   addSignal(undefined, undefined, undefined, param.signalType)
        //   break
        // case 'altStart':
        //   addSignal(undefined, undefined, param.altText, param.signalType)
        //   break
        // case 'else':
        //   addSignal(undefined, undefined, param.altText, param.signalType)
        //   break
        // case 'altEnd':
        //   addSignal(undefined, undefined, undefined, param.signalType)
        //   break
        case 'setTitle':
          db.setTitle(param.text)
          break
        // case 'parStart':
        //   addSignal(undefined, undefined, param.parText, param.signalType)
        //   break
        // case 'and':
        //   addSignal(undefined, undefined, param.parText, param.signalType)
        //   break
        // case 'parEnd':
        //   addSignal(undefined, undefined, undefined, param.signalType)
        //   break
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

// export const getActorKeys = function () {
//   return Object.keys(actors)
// }

// export const enableSequenceNumbers = function () {
//   sequenceNumbersEnabled = true
// }
// export const showSequenceNumbers = () => sequenceNumbersEnabled

// export const setWrap = function (wrapSetting) {
//   wrapEnabled = wrapSetting
// }

type ApplyParam =
  | {
      type: 'addActor'
      actor: string
      description: WrappedText
    }
  | {
      type: 'activeStart' | 'activeEnd'
      actor: { type: string; actor: string }
      signalType: LINETYPE
    }
  | {
      type: 'addNote'
      actor: string
      placement: PLACEMENT
      text: WrappedText
    }
  | {
      type: 'addMessage'
      from: { actor: string }
      to: { actor: string }
      msg: WrappedText
      signalType: LINETYPE
    }
  | {
      type: 'setTitle'
      text: WrappedText
    }

export {
  db
}

export default {
  addActor: db.addActor,
  addMessage: db.addMessage,
  addSignal: db.addSignal,
  // setWrap,
  // enableSequenceNumbers,
  // showSequenceNumbers,
  // getActorKeys,
  // getTitle,
  // getTitleWrapped,
  // clear,
  parseMessage: db.parseMessage,
  LINETYPE,
  ARROWTYPE,
  PLACEMENT,
  addNote: db.addNote,
  setTitle: db.setTitle,
  apply: db.apply,
}
