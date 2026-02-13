import { renderToAscii } from './test-helpers'

describe('ascii-renderer-cases', () => {
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
})
