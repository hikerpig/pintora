import { configApi } from '@pintora/core'
import { AsciiRenderer } from '../../AsciiRenderer'
import { sequenceIr } from './fixtures/sequence-ir'
import { resolveTextRendererOptions } from '../config'
import { renderToAscii } from './test-helpers'

describe('AsciiRenderer', () => {
  const originalConfig = configApi.cloneConfig()

  afterEach(() => {
    configApi.replaceConfig(originalConfig)
  })

  it('renders pre element and exposes text content', () => {
    const container = document.createElement('div')
    const renderer = new AsciiRenderer(sequenceIr)

    renderer.setContainer(container)
    renderer.render()

    expect(renderer.getRootElement().tagName).toBe('PRE')
    expect(renderer.getTextContent?.()).toMatch(/张\s*三/)
  })

  it('resolves text renderer options with sane defaults', () => {
    const options = resolveTextRendererOptions({
      core: { textRenderer: { cellWidth: 7, cellHeight: 15, trimRight: false, ansi: true } },
    })

    expect(options.cellWidth).toBe(7)
    expect(options.cellHeight).toBe(15)
    expect(options.trimRight).toBe(false)
    expect(options.ansi).toBe(false)
  })

  it('can print rendered ascii text when debug env is enabled', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    const prev = process.env.PINTORA_ASCII_TEST_DEBUG
    process.env.PINTORA_ASCII_TEST_DEBUG = '1'

    try {
      renderToAscii(`
sequenceDiagram
  User->>Pintora: render this
      `)
      expect(spy).toHaveBeenCalled()
    } finally {
      if (prev === undefined) {
        delete process.env.PINTORA_ASCII_TEST_DEBUG
      } else {
        process.env.PINTORA_ASCII_TEST_DEBUG = prev
      }
      spy.mockRestore()
    }
  })
})
