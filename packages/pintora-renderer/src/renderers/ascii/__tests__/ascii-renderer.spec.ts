import { configApi } from '@pintora/core'
import { AsciiRenderer } from '../../AsciiRenderer'

const sequenceGraphicIR = {
  width: 120,
  height: 80,
  mark: { type: 'group', children: [] },
  rendererData: {
    ascii: {
      sequence: {
        meta: { direction: 'TB' },
        actors: [
          { id: 'User', label: 'User' },
          { id: 'Pintora', label: 'Pintora' },
        ],
        events: [
          {
            kind: 'message',
            fromActorId: 'User',
            toActorId: 'Pintora',
            label: 'render this',
            style: 'solid',
            isSelf: false,
          },
        ],
      },
    },
  },
} as any

describe('AsciiRenderer', () => {
  const originalConfig = configApi.cloneConfig()

  afterEach(() => {
    configApi.replaceConfig(originalConfig)
  })

  it('renders a PRE root and exposes text content from rendererData', () => {
    const container = document.createElement('div')
    const renderer = new AsciiRenderer(sequenceGraphicIR)

    renderer.setContainer(container)
    renderer.render()

    expect(renderer.getRootElement().tagName).toBe('PRE')
    expect(renderer.getTextContent?.()).toContain('render this')
  })
})
