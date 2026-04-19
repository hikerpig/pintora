import { renderToAscii } from '../helpers'

describe('sequence ascii rendering', () => {
  it('renders base messages with compact arrows', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant User
  participant Pintora
  User->>Pintora: render this
    `)

    expect(text.replace(/\s/g, '')).toContain('▶')
    expect(text).toContain('render this')
  })

  it('renders self messages, notes, and dividers from templates', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant User
  User->>User: retry
  note right of User: ascii lane
  == Divider ==
    `)

    expect(text).toContain('retry')
    expect(text).toContain('┐')
    expect(text).toContain('┘')
    expect(text).toContain('ascii lane')
    expect(text).toContain('Divider')
  })

  it('keeps CJK labels intact', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant 张三
  participant 李四
  张三-->>李四: 你好
    `)

    expect(text).toContain('张三')
    expect(text).toContain('李四')
    expect(text).toContain('你好')
  })

  it('renders dashed, open, and open-dashed arrows', () => {
    const text = renderToAscii(`
sequenceDiagram
  A-->>B: dashed
  B->A: open
  A-->B: open dashed
    `)

    const compact = text.replace(/\s/g, '')
    expect(compact).toContain('▷')
    expect(compact).toContain('╌')
  })
})
