import { FederatedEvent } from '@antv/g-lite'
import { IGraphicEvent, Mark, DiagramEventType } from '@pintora/core'

export type EventType = DiagramEventType

/**
 * wire @antv/g with IGraphicEvent interface
 */
export class GraphicEvent implements IGraphicEvent {
  type: EventType
  gEvent: FederatedEvent

  mark: Mark | undefined
  markPath: Mark[] | undefined

  constructor(gEvent: FederatedEvent) {
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
    return this.gEvent.viewportX
  }

  public get clientY(): number {
    return this.gEvent.viewportY
  }
}
