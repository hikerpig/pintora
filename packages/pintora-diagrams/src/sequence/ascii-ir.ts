import { SequenceLayoutResult } from './layout-result'

export type SequenceAsciiIR = {
  meta: {
    title?: string
    direction: 'TB'
  }
  actors: Array<{
    id: string
    label: string
    classifier?: string
  }>
  events: SequenceLayoutResult['events']
  activations: SequenceLayoutResult['activations']
  spans: SequenceLayoutResult['spans']
}

/** @deprecated Prefer toSequenceSnapshotTextDiagramPlan */
export function toSequenceAsciiIR(layoutResult: SequenceLayoutResult): SequenceAsciiIR {
  return {
    meta: {
      title: layoutResult.title,
      direction: 'TB',
    },
    actors: layoutResult.actors.map(actor => ({
      id: actor.id,
      label: actor.label,
      classifier: actor.classifier,
    })),
    events: layoutResult.events,
    activations: layoutResult.activations,
    spans: layoutResult.spans,
  }
}
