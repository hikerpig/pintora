/* eslint-disable @typescript-eslint/no-empty-function */
import { pintoraStandalone } from '../index'
import { EXAMPLES } from '@pintora/test-shared'

describe('pintora standalone', () => {
  let container: HTMLDivElement
  let cleanup: () => void
  beforeEach(() => {
    container = document.createElement('div')
  })

  afterEach(() => {
    if (cleanup) {
      cleanup()
      cleanup = null
    }
  })

  describe('getConfigFromElement', () => {
    it('get some configs', () => {
      const div = document.createElement('div')
      div.setAttribute('data-theme', 'dark')
      div.setAttribute('data-renderer', 'canvas')

      expect(pintoraStandalone.getConfigFromElement(div)).toEqual({
        theme: 'dark',
        renderer: 'canvas',
      })
    })
  })

  describe('renderTo', () => {
    it('set config for only one render', () => {
      const code = EXAMPLES.er.code
      pintoraStandalone.renderTo(code, {
        container,
        config: {
          themeConfig: {
            theme: 'dark',
          },
        },
      })

      expect(pintoraStandalone.getConfig().themeConfig.theme).toBe('default')
    })

    it('should accept container as css selector', () => {
      const parentCls = 'test'
      const parent = document.createElement('div')
      parent.classList.add(parentCls)
      document.body.appendChild(parent)
      cleanup = () => {
        parent.remove()
      }

      pintoraStandalone.renderTo(EXAMPLES.sequence.code, {
        container: `.${parentCls}`,
      })

      expect(parent.querySelector('svg')).toBeTruthy()
    })

    it('calls `renderer.on` and diagramEventManager methods if `eventsHandlers` is passed', () => {
      cleanup = () => {
        removeRecognizer()
      }

      const code = EXAMPLES.er.code

      const dblclick = jest.fn()
      const removeRecognizer = pintoraStandalone.diagramEventManager.addRecognizer({
        recognize: e => {
          return { graphicEvent: e } as any
        },
      })
      pintoraStandalone.renderTo(code, {
        container,
        eventsHandlers: {
          dblclick,
        },
        onRender(_renderer) {
          const fakeGEvent = {
            type: 'dblclick',
            shape: {},
            propagationPath: [],
          }
          ;(_renderer as any).gcvs.emit('dblclick', fakeGEvent)
        },
      })

      expect(dblclick).toBeCalledWith(expect.any(Object))

      removeRecognizer()
    })
  })

  describe('renderContentOf', () => {
    it('should create render result and insert before container', () => {
      const parent = document.createElement('div')
      parent.appendChild(container)

      container.innerText = EXAMPLES.sequence.code
      const resultElement = pintoraStandalone.renderContentOf(container)

      expect(container.previousElementSibling).toBe(resultElement)
    })

    it('should not create multiple result elements even after multiple calls', () => {
      const parent = document.createElement('div')
      parent.appendChild(container)
      container.innerText = EXAMPLES.sequence.code

      pintoraStandalone.renderContentOf(container)
      pintoraStandalone.renderContentOf(container)

      expect(parent.children).toHaveLength(2)
    })

    it('can use options.getContent', () => {
      const innerEle = document.createElement('pre')
      innerEle.innerText = EXAMPLES.sequence.code

      const sibling = document.createElement('div')
      sibling.innerText = 'unrelevant content'

      container.appendChild(innerEle)
      container.appendChild(sibling)

      const resultElement = pintoraStandalone.renderContentOf(container, {
        getContent() {
          return innerEle.innerText
        },
      })
      expect(resultElement.querySelector('svg')).toBeTruthy()
    })
  })
})
