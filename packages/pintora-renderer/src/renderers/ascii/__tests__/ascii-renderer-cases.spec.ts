import { configApi } from '@pintora/core'
import { renderToAscii } from './test-helpers'

describe('ascii-renderer-cases', () => {
  const originalConfig = configApi.cloneConfig()

  afterEach(() => {
    configApi.replaceConfig(originalConfig)
  })

  describe('sequence diagram', () => {
    it('can render unicode text diagram with ascii renderer', () => {
      const code = `
      sequenceDiagram
        participant 张三
        participant 李四
        张三->>李四: 你好
      `

      const text = renderToAscii(code)

      expect(text.length).toBeGreaterThan(10)
      const compact = text.replace(/\s/g, '')
      expect(compact).toContain('张三')
      expect(compact).toContain('李四')
    })

    it('keeps centered message and divider labels off border rows in ascii renderer', () => {
      const code = `
      sequenceDiagram
        User->>Pintora: render this
        == Divider ==
      `

      const text = renderToAscii(code)
      const lines = text.split('\n')
      const messageLine = lines.find(line => line.includes('render this'))
      const dividerLine = lines.find(line => line.includes('Divider'))

      expect(messageLine).toBeTruthy()
      expect(dividerLine).toBeTruthy()
      expect(messageLine).not.toMatch(/[└┘+\-]/)
      expect(dividerLine).not.toMatch(/[─-]Divider|Divider[─-]/)
      expect(dividerLine).toMatch(/[│|] Divider\s+[│|]/)
    })

    it('renders compact glyph variants for filled, dashed, and open arrows', () => {
      const code = `
      sequenceDiagram
        A->>B: Solid arrow
        B-->>A: Dashed arrow
        A-)B: Open arrow
        B--)A: Open dashed arrow
      `

      const text = renderToAscii(code)
      const compact = text.replace(/\s/g, '')

      expect(compact).toContain('▶')
      expect(compact).toContain('▷')
      expect(compact).toContain('╌')
      expect(compact).toContain('◁')
    })
  })

  describe('class diagram', () => {
    it.each([
      [
        'single class with title',
        `
classDiagram
  title: Class Diagram
  class Apple {
    float softness
    {static} Apple fromString(str)
  }
      `,
      ],
      [
        'multi-class diagram keeps member line inside border',
        `
classDiagram
  class Apple {
    float softness
    #Apple fromString(str)
  }
  class Fruit {
    <<interface>>
    float sweetness
    -float age
    float getAge()
  }
      `,
      ],
    ])('keeps class members inside entity borders in ascii renderer - %s', (_name, code) => {
      const text = renderToAscii(code)

      const memberLine = text.split('\n').find(line => line.includes('Apple fromString(str)'))
      const targetLine = memberLine

      expect(targetLine).toBeTruthy()
      expect(targetLine).toMatch(/[│├|+].*Apple fromString.*[│┤|+]/)
      expect(targetLine).not.toContain(')──')
    })

    it('keeps class body text off horizontal borders in ascii renderer', () => {
      const code = `
classDiagram
  class Fruit {
    <<interface>>
    float sweetness
    -float age
    float getAge()
  }
      `

      const text = renderToAscii(code)

      const sweetnessLine = text.split('\n').find(line => line.includes('float sweetness'))
      const ageLine = text.split('\n').find(line => line.includes('float age'))
      const methodLine = text.split('\n').find(line => line.includes('float getAge()'))
      const hasHorizontalBorder = /─|-{2,}/

      expect(sweetnessLine).toBeTruthy()
      expect(ageLine).toBeTruthy()
      expect(methodLine).toBeTruthy()
      expect(sweetnessLine).not.toMatch(hasHorizontalBorder)
      expect(ageLine).not.toMatch(hasHorizontalBorder)
      expect(methodLine).not.toMatch(hasHorizontalBorder)
    })
  })

  describe('component diagram', () => {
    it('renders compact arrow markers for component relationships', () => {
      const code = `
componentDiagram
  [A] --> [B] : solid
  [B] ..> [C] : dotted
  [A] <.. [C] : reverse
      `

      const text = renderToAscii(code)
      const compact = text.replace(/\s/g, '')

      expect(compact).toMatch(/[▶◀▼▲]/)
      expect(compact).toMatch(/[╌╎]/)
    })

    it('points component dependency arrows toward the implemented interface inside packages', () => {
      const code = `
componentDiagram
  package "@pintora/core" {
    () IDiagram
  }
  package "@pintora/diagrams" {
    [...Multiple Diagrams...] as diagrams
    [diagrams] --> IDiagram : implements
  }
      `

      const text = renderToAscii(code)
      const compact = text.replace(/\s/g, '')

      expect(compact).toContain('implements')
      expect(compact).toContain('▼')
      expect(compact).not.toContain('▲')
    })
  })

  describe('activity diagram', () => {
    it('renders compact arrow markers for straight activity flows', () => {
      const code = `
activityDiagram
  start
  :Do work;
  stop
      `

      const text = renderToAscii(code)
      const compact = text.replace(/\s/g, '')

      expect(compact).toContain('Do work'.replace(/\s/g, ''))
      expect(compact).toContain('▼')
      expect(compact).not.toContain('▲')
    })

    it('keeps a single partition action off the outer border in ascii renderer', () => {
      configApi.setConfig({
        core: {
          textRenderer: {
            charset: 'ascii',
          },
        },
      })

      const code = `
activityDiagram
  start
  partition Init {
    :read config;
  }
      `

      const text = renderToAscii(code)
      const lines = text.split('\n')
      const readConfigLineIndex = lines.findIndex(line => line.includes('read config'))
      const readConfigLine = readConfigLineIndex >= 0 ? lines[readConfigLineIndex] : ''

      expect(readConfigLineIndex).toBeGreaterThanOrEqual(0)
      expect(lines[readConfigLineIndex - 1]).toMatch(/\+[-v]+\+/)
      expect(readConfigLine).toMatch(/\|\s*read config\s+\|/)
    })

    it('keeps partition actions and note borders separated in ascii renderer', () => {
      configApi.setConfig({
        core: {
          textRenderer: {
            charset: 'ascii',
          },
        },
      })

      const code = `
activityDiagram
  start
  partition Init {
    :read config;
    :init internal services;
    note left: init themes
  }
      `

      const text = renderToAscii(code)
      const lines = text.split('\n')
      const readConfigLineIndex = lines.findIndex(line => line.includes('read config'))
      const initServicesLineIndex = lines.findIndex(line => line.includes('init internal services'))
      const readConfigLine = readConfigLineIndex >= 0 ? lines[readConfigLineIndex] : ''
      const initServicesLine = initServicesLineIndex >= 0 ? lines[initServicesLineIndex] : ''

      expect(readConfigLineIndex).toBeGreaterThanOrEqual(0)
      expect(initServicesLineIndex).toBeGreaterThanOrEqual(0)
      expect(lines[readConfigLineIndex - 1]).toMatch(/\+[-v]+\+/)
      expect(readConfigLine).toMatch(/\|\s*read config\s+\|/)
      expect(initServicesLine).toMatch(/\|\s+\|init themes\s+\|\s{2}\|init internal services\s+\|/)
      expect(initServicesLine).not.toContain('||')
    })

    it('keeps right-side notes outside partition action text in ascii renderer', () => {
      configApi.setConfig({
        core: {
          textRenderer: {
            charset: 'ascii',
          },
        },
      })

      const code = `
activityDiagram
  start
  partition Init {
    :read config;
    :init internal services;
    note right: init themes
  }
      `

      const text = renderToAscii(code)
      const lines = text.split('\n')
      const sharedLine = lines.find(line => line.includes('init internal services')) || ''

      expect(sharedLine).toMatch(/\|\s+init internal services\s+\|\s{2}\|\s*init themes\s+\|/)
      expect(sharedLine).not.toContain('init internal serviinit themes')
    })

    it('keeps left-side notes from piercing the partition title row in ascii renderer', () => {
      configApi.setConfig({
        core: {
          textRenderer: {
            charset: 'ascii',
          },
        },
      })

      const code = `
activityDiagram
  start
  partition Init {
    :init internal services;
    note left: init themes
  }
      `

      const text = renderToAscii(code)
      const lines = text.split('\n')
      const titleLine = lines.find(line => line.includes('Init')) || ''
      const actionLine = lines.find(line => line.includes('init internal services')) || ''

      expect(titleLine).not.toContain('Init────────')
      expect(actionLine).toMatch(/\|\s+\|init themes\s+\|\s{2}\|init internal services\s+\|/)
    })
  })

  describe('er diagram', () => {
    it('keeps attribute comment text off the entity border in ascii renderer', () => {
      configApi.setConfig({
        core: {
          textRenderer: {
            charset: 'ascii',
          },
        },
      })

      const code = `
erDiagram
  PERSON {
    int phone "phone number"
  }
      `

      const text = renderToAscii(code)
      const lines = text.split('\n')
      const numberLine = lines.find(line => line.includes('phone number'))
      const personLine = lines.find(line => line.includes('PERSON'))

      expect(numberLine).toBeTruthy()
      expect(numberLine).toContain('r|')
      expect(numberLine).not.toContain('||')
      expect(personLine).toBeTruthy()
      expect(personLine).not.toContain('--')

      // should not eliminate this separator line
      const itemLineIndex = lines.findIndex(line => line.includes('phone'))
      const separatorLine = lines[itemLineIndex - 1]
      expect(separatorLine).toContain('---')
    })

    it('keeps er entity title, separator, and long comment on separate rows in ascii renderer', () => {
      configApi.setConfig({
        core: {
          textRenderer: {
            charset: 'ascii',
          },
        },
      })

      const code = `
erDiagram
  ORDER {
    int order_number PK
    string adress "delivery address"
  }
      `

      const text = renderToAscii(code)
      const lines = text.split('\n')
      const titleLineIndex = lines.findIndex(line => line.includes('ORDER'))
      const orderNumberLineIndex = lines.findIndex(line => line.includes('order_number'))
      const commentLineIndex = lines.findIndex(line => line.includes('delivery address'))

      expect(titleLineIndex).toBeGreaterThanOrEqual(0)
      expect(orderNumberLineIndex).toBeGreaterThan(titleLineIndex)
      expect(commentLineIndex).toBeGreaterThan(orderNumberLineIndex)

      expect(lines[titleLineIndex]).not.toMatch(/-{2,}/)
      expect(lines[commentLineIndex]).not.toMatch(/-{2,}/)

      const separatorLine = lines[orderNumberLineIndex - 1]
      expect(separatorLine).toContain('---')
      expect(separatorLine).not.toContain('ORDER')
    })

    it('renders compact cardinality markers instead of flattened path noise', () => {
      const code = `
erDiagram
  @param {
    layoutDirection LR
  }
  A ||--|| B : r1
  C ||--o{ D : r2
  E |o--|{ F : r3
  G }|--o{ H : r4
      `

      const text = renderToAscii(code)
      const compact = text.replace(/\s/g, '')

      expect(compact).toContain('○')
      expect(compact).toContain('╟')
      expect(compact).toContain('╢')
      expect(compact).not.toContain('╳')
    })

    it('renders compact cardinality markers for TD layout too', () => {
      const code = `
erDiagram
  A ||--|| B : r1
  C ||--o{ D : r2
  E |o--|{ F : r3
  G }|--o{ H : r4
      `

      const text = renderToAscii(code)
      const compact = text.replace(/\s/g, '')

      expect(compact).toContain('○')
      expect(compact).toMatch(/[╤╧]/)
      expect(compact).not.toContain('╳')
    })
  })
})
