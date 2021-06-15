export type TRect = {
  x: number
  y: number
  width: number
  height: number
}

export function getCenterPoint(rect: TRect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}

export type Bounds = ClientRect
