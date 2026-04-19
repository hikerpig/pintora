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

export type SequenceTextColumn = {
  actorId: string
  centerCol: number
  headerLeftCol: number
  headerRightCol: number
  lifelineCol: number
}

export type SequenceTextRowKind =
  | 'message-label'
  | 'message-arrow'
  | 'self-message'
  | 'divider'
  | 'note'
  | 'block-header'
  | 'block-section'

export type SequenceTextRow = {
  kind: SequenceTextRowKind
  startRow: number
  endRow: number
  eventIndex?: number
}

export type SequenceTextMessagePlan = {
  eventIndex: number
  fromActorId: string
  toActorId: string
  label: string
  arrowRow: number
  labelRows: number[]
  style: 'solid' | 'dashed' | 'open' | 'open-dashed'
  isSelf: boolean
}

export type SequenceTextNotePlan = {
  eventIndex: number
  anchorActors: string[]
  lane: 'left' | 'right' | 'over'
  boxCols: [number, number]
  boxRows: [number, number]
}

export type SequenceTextSelfMessagePlan = {
  eventIndex: number
  actorId: string
  label: string
  labelRows: number[]
  loopCols: [number, number]
  loopRows: [number, number]
  arrowHeadCol: number
  arrowHeadRow: number
}

export type SequenceTextDividerPlan = {
  eventIndex: number
  text: string
  strokeRow: number
  ruleCols: [number, number]
  labelCol: number
  labelCols: [number, number]
  textExclusionCols: [number, number]
}

export type SequenceTextActivationPlan = {
  actorId: string
  startEventIndex: number
  endEventIndex: number
  level: number
  barCols: [number, number]
  barRows: [number, number]
}

export type SequenceTextBlockPlan = {
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
}

export type SequenceSpanBlockOccupancyPlan = {
  rows: SequenceTextRow[]
  messages: SequenceTextMessagePlan[]
  notes: SequenceTextNotePlan[]
  blocks: SequenceTextBlockPlan[]
  eventIndexToFirstRow: Map<number, number>
  eventIndexToLastRow: Map<number, number>
}

export type SequenceTextViewport = {
  minCol: number
  maxCol: number
  minRow: number
  maxRow: number
  renderOffsetCol: number
  renderOffsetRow: number
}

export type SequenceBaseEventPlan = {
  rows: SequenceTextRow[]
  messages: SequenceTextMessagePlan[]
  eventIndexToFirstRow: Map<number, number>
  eventIndexToLastRow: Map<number, number>
}

export type SequenceTextPlan = {
  source: SequenceAsciiRenderData
  columns: SequenceTextColumn[]
  rows: SequenceTextRow[]
  messages: SequenceTextMessagePlan[]
  notes: SequenceTextNotePlan[]
  selfMessages: SequenceTextSelfMessagePlan[]
  dividers: SequenceTextDividerPlan[]
  blocks: SequenceTextBlockPlan[]
  activations: SequenceTextActivationPlan[]
  viewport: SequenceTextViewport
}
