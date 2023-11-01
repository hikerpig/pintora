import EventEmitter from '@antv/event-emitter'
import { IDiagramEventRecognizer, IRenderer, Mark } from './type'
import {
  DiagramEventItem,
  IDiagramEvent,
  IGraphicEvent,
  DiagramEventType,
  PintoraDiagramItemDatas,
} from './types/event'

/**
 * A DiagramEvent eventbus
 */
export class DiagramEventManager {
  protected recognizers: IDiagramEventRecognizer[] = []
  protected emitter = new EventEmitter()

  addRecognizer(recognizer: IDiagramEventRecognizer) {
    if (!this.recognizers.includes(recognizer)) {
      this.recognizers.push(recognizer)
    }

    return () => {
      const index = this.recognizers.indexOf(recognizer)
      if (index > -1) this.recognizers.splice(index, 1)
    }
  }

  protected recognizeGraphicEvent(e: IGraphicEvent, ir: unknown) {
    const events: IDiagramEvent[] = []
    for (const recognizer of this.recognizers) {
      const result = recognizer.recognize(e, ir)
      if (result) events.push(result)
    }

    return events
  }

  feedGraphicEvent(e: IGraphicEvent, ir: unknown) {
    const dEvents = this.recognizeGraphicEvent(e, ir)
    for (const dEvent of dEvents) {
      this.emitter.emit(dEvent.type, dEvent)
    }
    return dEvents
  }

  wireCurrentEventsToRenderer(renderer: IRenderer, diagramIR: unknown) {
    for (const [eventName, listeners] of Object.entries(this.emitter.getEvents())) {
      for (const l of listeners) {
        const handler = l.callback as any
        this.wireDiagramEventToRenderer(renderer, eventName as DiagramEventType, handler, diagramIR)
      }
    }
  }

  wireDiagramEventToRenderer(
    renderer: IRenderer,
    eventName: DiagramEventType,
    handler: (diagramEvent: IDiagramEvent) => void,
    diagramIR: unknown,
  ) {
    return renderer.on(eventName, graphicEvent => {
      const dEvents = diagramEventManager.feedGraphicEvent(graphicEvent, diagramIR)
      for (const dEvent of dEvents) {
        handler(dEvent)
      }
    })
  }

  on<D extends keyof PintoraDiagramItemDatas = any, T extends keyof PintoraDiagramItemDatas[D] = any>(
    evt: DiagramEventType,
    handler: (dEvent: IDiagramEvent<D, T>) => void,
  ) {
    const { emitter } = this
    emitter.on(evt, handler)
    return function dispose() {
      emitter.off(evt, handler)
    }
  }

  once<D extends keyof PintoraDiagramItemDatas = any, T extends keyof PintoraDiagramItemDatas[D] = any>(
    evt: DiagramEventType,
    handler: (dEvent: IDiagramEvent<D, T>) => void,
  ) {
    const { emitter } = this
    emitter.once(evt, handler)
    return function dispose() {
      emitter.off(evt, handler)
    }
  }

  /**
   * Remove event listeners
   * @param evt - event name, if not passed, all event listeners will be removed
   */
  removeListeners(evt?: DiagramEventType) {
    this.emitter.off(evt)
  }

  /**
   * A type predicate function to narrow DiagramEventItem data type
   * @example
   * ```
   * if (matchEventItem(item, 'er', 'entity')) { // do something with item.data }
   * ```
   */
  matchEventItem<D extends keyof PintoraDiagramItemDatas = any, T extends keyof PintoraDiagramItemDatas[D] = any>(
    item: DiagramEventItem,
    diagram: D,
    type: T,
  ): item is DiagramEventItem<D, T> {
    return item.diagram === diagram && item.type === type
  }
}

export const diagramEventManager = new DiagramEventManager()

export class DiagramEvent implements IDiagramEvent {
  constructor(
    public graphicEvent: IGraphicEvent,
    public mark: Mark,
    public item: DiagramEventItem,
  ) {}

  get type() {
    return this.graphicEvent.type
  }
}

/**
 * A higher order function to make make DiagramEvent factory,
 *   the generated factory function should have the ability to infer and check data type
 */
export function diagramEventMakerFactory<D extends keyof PintoraDiagramItemDatas = any>(diagram: D) {
  return <T extends keyof PintoraDiagramItemDatas[D] = any>(
    e: IGraphicEvent,
    mark: Mark,
    id: string,
    type: T,
    data: PintoraDiagramItemDatas[D][T],
  ) => {
    return new DiagramEvent(e, mark, {
      diagram,
      type,
      id,
      data,
    })
  }
}
