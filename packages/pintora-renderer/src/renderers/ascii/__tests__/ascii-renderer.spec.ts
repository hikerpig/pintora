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

  it('renders block and activation templates from the embedded sequence plan input', () => {
    const renderer = new AsciiRenderer({
      width: 120,
      height: 80,
      mark: { type: 'group', children: [] },
      rendererData: {
        ascii: {
          sequence: {
            meta: { direction: 'TB' },
            actors: [
              { id: 'A', label: 'A' },
              { id: 'B', label: 'B' },
            ],
            events: [
              {
                kind: 'message',
                index: 0,
                fromActorId: 'A',
                toActorId: 'B',
                label: 'enter',
                style: 'solid',
                isSelf: false,
              },
            ],
            activations: [{ actorId: 'B', startEventIndex: 0, endEventIndex: 0, level: 0 }],
            spans: [{ kind: 'opt', startEventIndex: 0, endEventIndex: 0, label: 'fast path' }],
          },
        },
      },
    } as any)

    renderer.setContainer(document.createElement('div'))
    renderer.render()

    expect(renderer.getTextContent?.()).toContain('fast path')
    expect(renderer.getTextContent?.()).toContain('|')
    expect(renderer.getTextContent?.()).not.toContain('||')
    expect(renderer.getTextContent?.()).not.toContain('█')
  })
})
