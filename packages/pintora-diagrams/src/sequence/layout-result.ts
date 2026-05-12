import { SequenceLayoutSnapshot } from './layout-snapshot'

export type SequenceLayoutResult = {
  title?: string
  actors: Array<{
    id: string
    label: string
    classifier?: string
    order: number
  }>
  events: Array<
    | {
        kind: 'message'
        index: number
        fromActorId: string
        toActorId: string
        label: string
        style: 'solid' | 'dashed' | 'open' | 'open-dashed'
        isSelf: boolean
      }
    | {
        kind: 'note'
        index: number
        anchorActorIds: string[]
        placement: 'left' | 'right' | 'over'
        text: string
      }
    | {
        kind: 'divider'
        index: number
        text: string
      }
  >
  activations: Array<{
    actorId: string
    startEventIndex: number
    endEventIndex: number
    level: number
  }>
  spans: Array<{
    kind: 'loop' | 'opt' | 'alt' | 'par'
    startEventIndex: number
    endEventIndex: number
    label: string
    sections?: Array<{ eventIndex: number; label: string }>
  }>
}

export function buildSequenceLayoutResult(snapshot: SequenceLayoutSnapshot): SequenceLayoutResult {
  return {
    title: snapshot.title,
    actors: snapshot.actors.map(actor => ({
      id: actor.id,
      label: actor.label,
      classifier: actor.classifier,
      order: actor.order,
    })),
    events: snapshot.events.map(event => {
      if (event.kind === 'message') {
        return {
          kind: 'message' as const,
          index: event.index,
          fromActorId: event.fromActorId,
          toActorId: event.toActorId,
          label: event.label,
          style: event.style,
          isSelf: event.isSelf,
        }
      }
      if (event.kind === 'note') {
        return {
          kind: 'note' as const,
          index: event.index,
          anchorActorIds: event.anchorActorIds,
          placement: event.placement,
          text: event.text,
        }
      }
      return {
        kind: 'divider' as const,
        index: event.index,
        text: event.text,
      }
    }),
    activations: snapshot.activations.map(activation => ({
      actorId: activation.actorId,
      startEventIndex: activation.startEventIndex,
      endEventIndex: activation.endEventIndex,
      level: activation.level,
    })),
    spans: snapshot.spans.map(span => ({
      kind: span.kind,
      startEventIndex: span.startEventIndex,
      endEventIndex: span.endEventIndex,
      label: span.label,
      sections: span.sections?.map(section => ({
        eventIndex: section.eventIndex,
        label: section.label,
      })),
    })),
  }
}
