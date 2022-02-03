import { themeRegistry } from '../themes'

describe('pintora core themeRegistry', () => {
  it('registerTheme', () => {
    const duskTheme = {}
    themeRegistry.registerTheme('dusk', duskTheme as any)

    expect(themeRegistry.themes['dusk']).toBe(duskTheme)
  })
})
