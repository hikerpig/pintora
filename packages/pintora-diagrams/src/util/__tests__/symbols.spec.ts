import { symbolRegistry } from '@pintora/core'
import '../symbols'

describe('common symbols', () => {
  it('draws actor icon with the body attached to the head', () => {
    const symbol = symbolRegistry.create('actor', {
      mode: 'icon',
      contentArea: { x: 0, y: 0, width: 22, height: 36 },
      attrs: { stroke: '#000', lineWidth: 1 },
    })!
    const head = symbol.mark.children.find(child => child.type === 'circle')!
    const body = symbol.mark.children.find(child => child.type === 'path')!
    const headBottomY = head.attrs.y + head.attrs.r
    const verticalBodyStart = Array.isArray(body.attrs.path)
      ? body.attrs.path.find(command => command[0] === 'M' && command[1] === head.attrs.x)
      : null

    expect(verticalBodyStart).toBeTruthy()
    expect(verticalBodyStart![2]).toBeCloseTo(headBottomY)
  })
})
