import { Event as GEvent } from '@antv/g-base'
import { IGraphicEvent, Mark, DiagramEventType } from '@pintora/core'

export type EventType = DiagramEventType

/**
 * wire @antv/g with IGraphicEvent interface
 */
export class GraphicEvent implements IGraphicEvent {
  type: EventType
  gEvent: GEvent

  mark: Mark | undefined
  markPath: Mark[] | undefined

  constructor(gEvent: GEvent) {
    this.type = gEvent.type as EventType
    this.gEvent = gEvent
  }

  public get originEvent(): any {
    return this.gEvent.originalEvent
  }

  public get x(): number {
    return this.gEvent.x
  }

  public get y(): number {
    return this.gEvent.y
  }

  public get clientX(): number {
    return this.gEvent.clientX
  }

  public get clientY(): number {
    return this.gEvent.clientY
  }
}
