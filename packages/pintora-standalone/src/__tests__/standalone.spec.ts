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

    function makeFakeGraphicEvent(eventName = 'dblclick') {
      // Use Object.defineProperty to make propagationPath writable for @antv/g v6 compatibility
      const event = {
        type: eventName,
        shape: {},
      }
      return event
    }

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
          const fakeGEvent = makeFakeGraphicEvent()
          ;(_renderer as any).gcvs.emit('dblclick', fakeGEvent)
        },
      })

      expect(dblclick).toHaveBeenCalledWith(expect.any(Object))
    })

    it('eventsHandlers will only be triggered by coresponding render', () => {
      cleanup = () => {
        removeRecognizer()
      }

      const code = EXAMPLES.er.code

      const dblclick1 = jest.fn()
      const dblclick2 = jest.fn()
      const removeRecognizer = pintoraStandalone.diagramEventManager.addRecognizer({
        recognize: e => {
          return { graphicEvent: e } as any
        },
      })

      pintoraStandalone.renderTo(code, {
        container,
        eventsHandlers: {
          dblclick: dblclick1,
        },
        onRender(_renderer) {
          const fakeGEvent = makeFakeGraphicEvent()
          ;(_renderer as any).gcvs.emit('dblclick', fakeGEvent)
        },
      })

      pintoraStandalone.renderTo(code, {
        container,
        eventsHandlers: {
          dblclick: dblclick2,
        },
        onRender(_renderer) {
          const fakeGEvent = makeFakeGraphicEvent()
          ;(_renderer as any).gcvs.emit('dblclick', fakeGEvent)
        },
      })

      expect(dblclick1).toHaveBeenCalledTimes(1)
      expect(dblclick2).toHaveBeenCalledTimes(1)
    })

    it('renders er relation paths with valid `d` in svg output', async () => {
      const code = `
      erDiagram
        CUSTOMER ||--o{ ORDER : places
      `
      pintoraStandalone.renderTo(code, {
        container,
        renderer: 'svg',
      })

      await new Promise(resolve => setTimeout(resolve, 20))

      const relationGroup = container.querySelector('.er__relations')
      expect(relationGroup).toBeTruthy()

      const relationPaths = Array.from(relationGroup!.querySelectorAll('path'))
      expect(relationPaths.length).toBeGreaterThan(0)
      relationPaths.forEach(pathEl => {
        expect(pathEl.getAttribute('d')).toBeTruthy()
      })
    })

    it('can render unicode text diagram with ascii renderer', () => {
      const code = `
      sequenceDiagram
        participant 张三
        participant 李四
        张三->>李四: 你好
      `

      let text = ''
      pintoraStandalone.renderTo(code, {
        container,
        renderer: 'ascii',
        onRender(renderer) {
          text = renderer.getTextContent?.() || ''
        },
      })

      const pre = container.querySelector('pre')
      expect(pre).toBeTruthy()
      expect(text.length).toBeGreaterThan(10)
      const compact = text.replace(/\s/g, '')
      expect(compact).toContain('张三')
      expect(compact).toContain('李四')
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
