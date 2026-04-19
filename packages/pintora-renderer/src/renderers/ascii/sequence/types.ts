export type SequenceAsciiRenderData = {
  meta: {
    title?: string
    direction: 'TB'
  }
  actors: Array<{
    id: string
    label: string
    classifier?: string
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
    sections?: Array<{
      eventIndex: number
      label: string
    }>
  }>
}

export function isSequenceAsciiRenderData(input: unknown): input is SequenceAsciiRenderData {
  if (!input || typeof input !== 'object') return false
  const value = input as SequenceAsciiRenderData
  return Array.isArray(value.actors) && Array.isArray(value.events) && value.meta?.direction === 'TB'
}

export type SequenceTextPlan = {
  source: SequenceAsciiRenderData
  columns: Array<{
    actorId: string
    centerCol: number
    headerLeftCol: number
    headerRightCol: number
    lifelineCol: number
  }>
  rows: Array<{
    kind: 'message-label' | 'message-arrow' | 'self-message' | 'divider' | 'note' | 'block-header' | 'block-section'
    startRow: number
    endRow: number
    eventIndex?: number
  }>
  messages: Array<{
    eventIndex: number
    fromActorId: string
    toActorId: string
    label: string
    arrowRow: number
    labelRows: number[]
    style: 'solid' | 'dashed' | 'open' | 'open-dashed'
    isSelf: boolean
  }>
  notes: Array<{
    anchorActors: string[]
    lane: 'left' | 'right' | 'over'
    boxCols: [number, number]
    boxRows: [number, number]
  }>
  blocks: Array<{
    kind: 'loop' | 'opt' | 'alt' | 'par'
    label: string
    startEventIndex: number
    endEventIndex: number
    headerRow: number
    bodyRows: [number, number]
    frameCols: [number, number]
    sections: Array<{
      label: string
      row: number
      eventIndex: number
    }>
  }>
  activations: Array<{
    actorId: string
    startEventIndex: number
    endEventIndex: number
    level: number
    barCols: [number, number]
    barRows: [number, number]
  }>
}
