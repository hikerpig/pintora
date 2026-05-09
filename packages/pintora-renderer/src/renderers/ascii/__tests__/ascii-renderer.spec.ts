import { configApi } from '@pintora/core'
import { AsciiRenderer } from '../../AsciiRenderer'

describe('AsciiRenderer', () => {
  const originalConfig = configApi.cloneConfig()

  afterEach(() => {
    configApi.replaceConfig(originalConfig)
  })

  it('renders a PRE root and exposes text content from rendererData.ascii.plan', () => {
    const container = document.createElement('div')
    const renderer = new AsciiRenderer({
      width: 120,
      height: 80,
      mark: { type: 'group', children: [] },
      rendererData: {
        ascii: {
          plan: {
            width: 16,
            height: 4,
            ops: [
              { type: 'rect', x: 0, y: 0, width: 12, height: 3 },
              { type: 'text', x: 6, y: 1, text: 'render this', align: 'center' },
            ],
          },
        },
      },
    } as any)

    renderer.setContainer(container)
    renderer.render()

    expect(renderer.getRootElement().tagName).toBe('PRE')
    expect(renderer.getTextContent?.()).toContain('render this')
    expect(container.textContent).toContain('render this')
  })

  it('renders an empty string when no ascii plan is present', () => {
    const renderer = new AsciiRenderer({
      width: 120,
      height: 80,
      mark: { type: 'group', children: [] },
    } as any)

    renderer.setContainer(document.createElement('div'))
    renderer.render()

    expect(renderer.getTextContent?.()).toBe('')
  })
})
