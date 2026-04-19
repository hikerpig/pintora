import { LINETYPE, Message, PLACEMENT, SequenceDiagramIR } from './db'
import { SequenceArtistLayoutState } from './artist/type'

type MessageStyle = 'solid' | 'dashed' | 'open' | 'open-dashed'
type NotePlacement = 'left' | 'right' | 'over'

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
  activations: []
  spans: []
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
  ir.messages.forEach((msg, index) => {
    const id = messageId(msg, index)
    if (msg.type === LINETYPE.NOTE) {
      const note = state.noteModelMap.get(id)
      if (!note) return
      events.push({
        kind: 'note',
        index,
        anchorActorIds: Array.isArray(msg.from) ? msg.from : [msg.from, msg.to].filter((v): v is string => Boolean(v)),
        placement: notePlacement(msg.placement),
        text: msg.text,
        bounds: { startX: note.startx, stopX: note.stopx, startY: note.starty, stopY: note.stopy },
      })
      return
    }
    if (msg.type === LINETYPE.DIVIDER) {
      const divider = state.dividerMap.get(id)
      if (!divider) return
      events.push({
        kind: 'divider',
        index,
        text: msg.text,
        bounds: { startX: divider.startx, stopX: divider.stopx, startY: divider.starty, stopY: divider.stopy },
      })
      return
    }
    const model = state.msgModelMap.get(id)
    if (!model || !msg.from || !msg.to || msg.text == null) return
    events.push({
      kind: 'message',
      index,
      fromActorId: msg.from,
      toActorId: msg.to,
      label: msg.text,
      style: messageStyle(msg.type),
      isSelf: msg.from === msg.to,
      bounds: { startX: model.startx, stopX: model.stopx, startY: model.starty, stopY: model.stopy },
    })
  })

  return {
    title: ir.title || undefined,
    actors,
    events,
    activations: [],
    spans: [],
  }
}
