import { LINETYPE, Message, PLACEMENT, SequenceDiagramIR } from './db'
import { SequenceArtistLayoutState } from './artist/type'

type MessageStyle = 'solid' | 'dashed' | 'open' | 'open-dashed'
type NotePlacement = 'left' | 'right' | 'over'
type SpanKind = 'loop' | 'opt' | 'alt' | 'par'

export type SequenceLayoutSnapshot = {
  title?: string
  actors: Array<{
    id: string
    label: string
    classifier?: string
    order: number
    centerX: number
    leftX: number
    rightX: number
  }>
  events: Array<
    | {
        kind: 'message'
        index: number
        fromActorId: string
        toActorId: string
        label: string
        style: MessageStyle
        isSelf: boolean
        bounds: { startX: number; stopX: number; startY: number; stopY: number }
      }
    | {
        kind: 'note'
        index: number
        anchorActorIds: string[]
        placement: NotePlacement
        text: string
        bounds: { startX: number; stopX: number; startY: number; stopY: number }
      }
    | {
        kind: 'divider'
        index: number
        text: string
        bounds: { startX: number; stopX: number; startY: number; stopY: number }
      }
  >
  activations: Array<{
    actorId: string
    startEventIndex: number
    endEventIndex: number
    level: number
  }>
  spans: Array<{
    kind: SpanKind
    startEventIndex: number
    endEventIndex: number
    label: string
    sections?: Array<{ eventIndex: number; label: string }>
  }>
}

function messageStyle(type: LINETYPE | undefined): MessageStyle {
  switch (type) {
    case LINETYPE.DOTTED:
      return 'dashed'
    case LINETYPE.SOLID_OPEN:
      return 'open'
    case LINETYPE.DOTTED_OPEN:
      return 'open-dashed'
    default:
      return 'solid'
  }
}

function notePlacement(value: PLACEMENT | undefined): NotePlacement {
  switch (value) {
    case PLACEMENT.LEFTOF:
      return 'left'
    case PLACEMENT.RIGHTOF:
      return 'right'
    default:
      return 'over'
  }
}

function messageId(msg: Message, index: number) {
  if (msg.id) return msg.id
  throw new Error(`Sequence message at index ${index} is missing an id after layout preparation`)
}

function normalizeLoopKind(loop: { kind?: SpanKind; title?: string }): SpanKind {
  if (loop.kind) return loop.kind
  if (!loop.title) return 'loop'
  const lower = loop.title.toLowerCase()
  if (lower.startsWith('opt')) return 'opt'
  if (lower.startsWith('alt')) return 'alt'
  if (lower.startsWith('par')) return 'par'
  return 'loop'
}

function findEventIndexAtOrAfterY(
  events: SequenceLayoutSnapshot['events'],
  y: number,
): number {
  for (let i = 0; i < events.length; i++) {
    if (events[i].bounds.startY >= y) return i
  }
  return events.length > 0 ? events.length - 1 : 0
}

function findEventIndexAtOrBeforeY(
  events: SequenceLayoutSnapshot['events'],
  y: number,
): number {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].bounds.stopY <= y) return i
  }
  return 0
}

export function captureSequenceLayoutSnapshot(
  ir: SequenceDiagramIR,
  state: SequenceArtistLayoutState,
): SequenceLayoutSnapshot {
  const actors = ir.actorOrder.map((id, order) => {
    const attrs = state.actorAttrsMap.get(id)
    if (!attrs) throw new Error(`Missing actor layout attrs for ${id}`)
    return {
      id,
      label: ir.actors[id].description,
      classifier: ir.actors[id].classifier,
      order,
      centerX: attrs.x + attrs.width / 2,
      leftX: attrs.x,
      rightX: attrs.x + attrs.width,
    }
  })

  const events: SequenceLayoutSnapshot['events'] = []
  const messageIndexToEventIndex = new Map<number, number>()
  let eventIndex = 0

  ir.messages.forEach((msg, messageIndex) => {
    const id = messageId(msg, messageIndex)
    if (msg.type === LINETYPE.NOTE) {
      const note = state.noteModelMap.get(id)
      if (!note) return
      messageIndexToEventIndex.set(messageIndex, eventIndex)
      events.push({
        kind: 'note',
        index: eventIndex,
        anchorActorIds: Array.isArray(msg.from) ? msg.from : [msg.from, msg.to].filter((v): v is string => Boolean(v)),
        placement: notePlacement(msg.placement),
        text: msg.text,
        bounds: { startX: note.startx, stopX: note.stopx, startY: note.starty, stopY: note.stopy },
      })
      eventIndex++
      return
    }
    if (msg.type === LINETYPE.DIVIDER) {
      const divider = state.dividerMap.get(id)
      if (!divider) return
      messageIndexToEventIndex.set(messageIndex, eventIndex)
      events.push({
        kind: 'divider',
        index: eventIndex,
        text: msg.text,
        bounds: { startX: divider.startx, stopX: divider.stopx, startY: divider.starty, stopY: divider.stopy },
      })
      eventIndex++
      return
    }
    const model = state.msgModelMap.get(id)
    if (!model || !msg.from || !msg.to || msg.text == null) return
    messageIndexToEventIndex.set(messageIndex, eventIndex)
    events.push({
      kind: 'message',
      index: eventIndex,
      fromActorId: msg.from,
      toActorId: msg.to,
      label: msg.text,
      style: messageStyle(msg.type),
      isSelf: msg.from === msg.to,
      bounds: { startX: model.startx, stopX: model.stopx, startY: model.starty, stopY: model.stopy },
    })
    eventIndex++
  })

  const activations = state.completedActivations.map(activation => {
    const startEventIndex = activation.startEventIndex ?? findEventIndexAtOrAfterY(events, activation.starty)
    const endEventIndex = activation.endEventIndex ?? findEventIndexAtOrBeforeY(events, activation.stopy)
    return {
      actorId: activation.actor,
      startEventIndex,
      endEventIndex: Math.max(startEventIndex, endEventIndex),
      level: activation.level ?? 0,
    }
  })

  const spans = state.loops.map(loop => {
    const kind = normalizeLoopKind(loop)
    const startEventIndex = findEventIndexAtOrAfterY(events, loop.starty)
    const endEventIndex = findEventIndexAtOrBeforeY(events, loop.stopy)
    const label = (loop.title || '').replace(/^\[(.*)\]$/, '$1')
    return {
      kind,
      startEventIndex,
      endEventIndex: Math.max(startEventIndex, endEventIndex),
      label,
      sections: (loop.sections || []).map(section => ({
        eventIndex: findEventIndexAtOrAfterY(events, section.y),
        label: (section.message.text || '').replace(/^\[(.*)\]$/, '$1'),
      })),
    }
  })

  return {
    title: ir.title || undefined,
    actors,
    events,
    activations,
    spans,
  }
}
