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

  it('renders alt blocks with section labels and activation bars', () => {
    const text = renderToAscii(`
sequenceDiagram
  A->>+B: enter
  alt cache miss
    loop retry
      B->>B: recompute
    end
  else cache hit
    B-->>A: return
  end
  deactivate B
    `)

    expect(text).toContain('alt cache miss')
    expect(text).toContain('cache hit')
    expect(text).toContain('loop retry')
    expect(text).toContain('|')
    expect(text).not.toContain('||')
    expect(text).not.toContain('█')
  })

  it('keeps nested blocks and activations deterministic without renderer repair', () => {
    const text = renderToAscii(`
sequenceDiagram
  A->>+B: outer
  opt warm cache
    alt cache miss
      B->>+B: nested
      B-->>-B: unwind
    else cache hit
      B-->>A: fast
    end
  end
  deactivate B
    `)

    expect(text).toContain('opt warm cache')
    expect(text).toContain('alt cache miss')
    expect(text).toContain('cache hit')
    expect((text.match(/\|/g) || []).length).toBeGreaterThan(2)
    expect(text).not.toContain('||')
    expect(text).not.toContain('█')
  })

  it('renders reverse arrows pointing left', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant A
  participant B
  B->>A: back
    `)

    expect(text.replace(/\s/g, '')).toContain('◀')
  })

  it('draws vertical lifelines below actor headers', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant A
  participant B
  A->>B: msg
    `)

    const lines = text.split('\n')
    // Skip first 3 rows which contain actor header boxes with │ sides
    const bodyLines = lines.slice(3)
    const hasLifeline = bodyLines.some(line => /[│┊]/.test(line))
    expect(hasLifeline).toBe(true)
  })

  it('renders divider text inside a planned exclusion zone', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant A
  participant B
  == Planned Pause ==
    `)

    const dividerLine = text.split('\n').find(line => line.includes('Planned Pause'))!
    expect(dividerLine).toContain('Planned Pause')
    expect(dividerLine).toMatch(/─\s+Planned Pause\s+─/)
  })

  it('renders dividers with horizontal rules separate from text', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant A
  participant B
  == Divider ==
    `)

    const lines = text.split('\n')
    // Skip first 3 rows which contain actor header boxes with ─ rules
    const bodyLines = lines.slice(3)
    const hasRule = bodyLines.some(line => /─.*─/.test(line))
    expect(hasRule).toBe(true)
    expect(text).toContain('Divider')
  })

  it('renders multiple dividers each with their own rule', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant A
  participant B
  == First ==
  A->>B: msg
  == Second ==
    `)

    expect(text).toContain('First')
    expect(text).toContain('Second')
    const ruleMatches = text
      .split('\n')
      .filter(
        line =>
          line.includes('─') &&
          !line.includes('┌') &&
          !line.includes('┐') &&
          !line.includes('└') &&
          !line.includes('┘'),
      )
    expect(ruleMatches.length).toBeGreaterThanOrEqual(2)
  })

  it('renders notes in correct lanes with box frames', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant A
  participant B
  note left of B: left note
  note right of A: right note
  note over A,B: over note
    `)

    expect(text).toContain('left note')
    expect(text).toContain('right note')
    expect(text).toContain('over note')
    expect(text).toContain('┌')
    expect(text).toContain('┘')
  })

  it('renders multiline notes with each line inside the note box', () => {
    const text = renderToAscii(`
sequenceDiagram
  @note over User,Pintora: ok
  @start_note right of User
multiline note
is possible
  @end_note
  == Divider ==
    `)

    const lines = text.split('\n')
    const firstNoteLine = lines.find(line => line.includes('multiline note'))!
    const secondNoteLine = lines.find(line => line.includes('is possible'))!
    const firstNoteLineIndex = lines.indexOf(firstNoteLine)
    const secondNoteLineIndex = lines.indexOf(secondNoteLine)
    const dividerIndex = lines.findIndex(line => line.includes('Divider'))

    expect(firstNoteLine).toMatch(/│\s+multiline note\s+│/)
    expect(secondNoteLine).toMatch(/│\s+is possible\s+│/)
    expect(secondNoteLineIndex).toBe(firstNoteLineIndex + 1)
    expect(dividerIndex).toBeGreaterThan(secondNoteLineIndex)
  })

  it('extends divider rules across actor columns after multiline notes', () => {
    const text = renderToAscii(`
sequenceDiagram
  User->>Pintora: render this
  @start_note right of User
  multiline note
  is possible
  @end_note
  == Divider ==
    `)

    const lines = text.split('\n')
    const actorLine = lines.find(line => line.includes('User') && line.includes('Pintora'))!
    const dividerLine = lines.find(line => line.includes('Divider'))!
    const userCenter = actorLine.indexOf('User') + Math.floor('User'.length / 2)
    const pintoraCenter = actorLine.indexOf('Pintora') + Math.floor('Pintora'.length / 2)
    const ruleCols = Array.from(dividerLine)
      .map((char, index) => (char === '─' ? index : -1))
      .filter(index => index >= 0)

    expect(Math.min(...ruleCols)).toBeLessThanOrEqual(userCenter)
    expect(Math.max(...ruleCols)).toBeGreaterThanOrEqual(pintoraCenter)
  })

  it('renders self-message loops from planned template geometry', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant Worker
  Worker->>Worker: retry later
    `)

    expect(text).toContain('retry later')
    expect(text).toContain('┐')
    expect(text).toContain('┘')
    expect(text.replace(/\s/g, '')).toContain('◀')
  })

  it('renders a complete Phase 1 diagram correctly', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant Alice
  participant Bob
  Alice->>Bob: hello
  note right of Alice: memo
  Bob-->>Alice: reply
  == Pause ==
  Alice->>Alice: think
    `)

    expect(text).toContain('Alice')
    expect(text).toContain('Bob')
    expect(text).toContain('hello')
    expect(text).toContain('reply')
    expect(text).toContain('memo')
    expect(text).toContain('Pause')
    expect(text).toContain('think')
    expect(text).toContain('│') // lifelines
  })

  it('renders left notes without changing the message arrow span', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant A
  participant B
  note left of A: outside
  A->>B: stable
    `)

    expect(text).toContain('outside')
    expect(text).toContain('stable')
    expect(text.replace(/\s/g, '')).toContain('A│')
    expect(text.replace(/\s/g, '')).toContain('▶')
  })

  it('renders planned nested span blocks with section boundaries and shifted occupants', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant Client
  participant API
  opt warm cache
    Client->>+API: request
    alt cache miss
      API->>API: recompute
    else cache hit
      API-->>Client: fast
    end
    == Done ==
    API-->>-Client: response
  end
    `)

    expect(text).toContain('opt warm cache')
    expect(text).toContain('alt cache miss')
    expect(text).toContain('cache hit')
    expect(text).toContain('Done')
    expect(text).toContain('response')
    expect(text).toContain('┌')
    expect(text).toContain('┘')
    expect(text).toContain('╌')
    expect(text).toContain('|')
    expect(text).not.toContain('||')
    expect(text).not.toContain('█')
  })

  it('renders planned self messages dividers and nested activations together', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant Client
  participant API
  Client->>+API: request
  API->>API: retry
  == Backoff ==
  API-->>-Client: response
    `)

    expect(text).toContain('request')
    expect(text).toContain('Backoff')
    expect(text).toContain('response')
    expect(text).toContain('┐')
    expect(text).toContain('┘')
    expect(text).toContain('|')
    expect(text).not.toContain('||')
    expect(text).not.toContain('█')
    expect(text.replace(/\s/g, '')).toContain('◀')
  })

  it('keeps chronology stable while rendering left right and over notes', () => {
    const text = renderToAscii(`
sequenceDiagram
  participant Client
  participant API
  note left of Client: local cache
  Client->>API: request
  note over Client,API: shared context
  API-->>Client: response
  note right of API: metrics
    `)

    const compact = text.replace(/\s/g, '')
    expect(text).toContain('local cache')
    expect(text).toContain('request')
    expect(text).toContain('shared context')
    expect(text).toContain('response')
    expect(text).toContain('metrics')
    expect(compact.indexOf('localcache')).toBeLessThan(compact.indexOf('request'))
    expect(compact.indexOf('request')).toBeLessThan(compact.indexOf('sharedcontext'))
    expect(compact.indexOf('sharedcontext')).toBeLessThan(compact.indexOf('response'))
    expect(compact.indexOf('response')).toBeLessThan(compact.indexOf('metrics'))
  })

  it('renders activated single-actor loops without overwriting message text', () => {
    const text = renderToAscii(`
sequenceDiagram
  User->>Pintora: render this
  activate Pintora
  loop Check input
    Pintora-->>Pintora: Has input changed?
  end
  Pintora-->>User: your figure here
  deactivate Pintora
    `)

    expect(text).toContain('Has input changed?')
    expect(text).toContain('your figure here')
    expect(text.split('\n').find(line => line.includes('render this'))).toMatch(/│\s+render this\s+│/)
    expect(text.split('\n').find(line => line.includes('your figure here'))).not.toContain('┘')
  })

  it('keeps a following divider outside the preceding loop block', () => {
    const text = renderToAscii(`
sequenceDiagram
  activate Pintora
  loop Check input
    Pintora-->>Pintora: Has input changed?
  end
  Pintora-->>User: your figure here

  == Divider ==
    `)

    const lines = text.split('\n')
    const loopBottomIndex = lines.findIndex(line => line.includes('└'))
    const dividerIndex = lines.findIndex(line => line.includes('Divider'))

    expect(loopBottomIndex).toBeGreaterThanOrEqual(0)
    expect(dividerIndex).toBeGreaterThan(loopBottomIndex)
  })
})

describe('er ascii rendering', () => {
  function firstLineContaining(text: string, needle: string) {
    return text.split('\n').findIndex(line => line.includes(needle))
  }

  it('renders entities, attributes, and relationship labels', () => {
    const text = renderToAscii(`
erDiagram
  artists {
    INTEGER ArtistId PK
    NVARCHAR Name
  }
  albums {
    INTEGER AlbumId PK
    INTEGER ArtistId FK
  }
  artists ||--o{ albums : "foreign key"
    `)

    expect(text).toContain('artists')
    expect(text).toContain('albums')
    expect(text).toContain('PK INTEGER ArtistId')
    expect(text).toContain('FK INTEGER ArtistId')
    expect(text).toContain('foreign key')
    expect(text).toContain('│')
    expect(text).toContain('○╟')
  })

  it('matches SVG inheritance rank direction for subtypes above supertypes', () => {
    const text = renderToAscii(`
erDiagram
  PERSON {
    string phone "phone number"
  }
  CUSTOMER inherit PERSON
  DELIVERER inherit PERSON
  CUSTOMER ||--o{ ORDER : places
    `)

    const customerLine = firstLineContaining(text, 'CUSTOMER')
    const delivererLine = firstLineContaining(text, 'DELIVERER')
    const personLine = firstLineContaining(text, 'PERSON')
    const orderLine = firstLineContaining(text, 'ORDER')

    expect(customerLine).toBeGreaterThanOrEqual(0)
    expect(delivererLine).toBeGreaterThanOrEqual(0)
    expect(personLine).toBeGreaterThanOrEqual(0)
    expect(orderLine).toBeGreaterThanOrEqual(0)
    expect(customerLine).toBeLessThan(personLine)
    expect(delivererLine).toBeLessThan(personLine)
    expect(customerLine).toBeLessThan(orderLine)
  })

  it('keeps complex ER diagrams compact and avoids marker-line collisions', () => {
    const text = renderToAscii(`
erDiagram
  PERSON {
    string phone "phone number"
  }
  CUSTOMER inherit PERSON
  DELIVERER inherit PERSON
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
  CUSTOMER }|..|{ DELIVERY-ADDRESS : uses
  ORDER {
    int order_number PK
    string adress "delivery address"
  }
  DELIVERER ||--o{ DELIVERY : completes
    `)

    expect(text).toContain('CUSTOMER')
    expect(text).toContain('ORDER')
    expect(text).toContain('places')
    expect(text).toContain('contains')
    expect(text).toContain('uses')
    expect(text).toContain('completes')
    expect(text).toContain('ISA')
    expect(text).toContain('○╟')
    expect(text).toContain('╟')
    expect(text).toMatch(/[╌┆]/)
    expect(text).toMatch(/[─│┼┬┴├┤]/)
    expect(text).not.toContain('CUSTOMER ||--o{ ORDER : places')
    expect(text).not.toContain('CUSTOMER inherit PERSON')
    expect(text).not.toMatch(/[─╌](?:○╟|╟|╢|╢○)/)
    expect(text).not.toMatch(/(?:○╟|╟|╢|╢○)[─╌]/)
  })
})

describe('activity ascii rendering', () => {
  it('renders activity nodes and flow connectors', () => {
    const text = renderToAscii(`
activityDiagram
  start
  :Diagram requested;
  if (diagram registered ?) then
    :get implementation;
  else (no)
    :show missing diagram;
  endif
  end
    `)

    expect(text).toContain('Diagram requested')
    expect(text).toContain('diagram registered ?')
    expect(text).toContain('get implementation')
    expect(text).toContain('show missing diagram')
    expect(text).toMatch(/[│─]/)
    expect(text).toMatch(/[▼▶]/)
  })
})

describe('component ascii rendering', () => {
  it('renders groups, component/interface nodes, labels, and arrows', () => {
    const text = renderToAscii(`
componentDiagram
  title: ASCII Component
  package "Core" {
    () GraphicsIR
    [Diagram Registry] as registry
  }
  [registry] --> GraphicsIR : returns
    `)

    expect(text).toContain('ASCII Component')
    expect(text).toContain('Core')
    expect(text).toContain('[package]')
    expect(text).toContain('GraphicsIR')
    expect(text).toContain('Diagram Registry')
    expect(text).toContain('returns')
    expect(text).toMatch(/[│─]/)
    expect(text).toMatch(/[▼▶]/)
    expect(text).not.toContain('[registry] --> GraphicsIR : returns')
  })

  it('renders skipped child-parent relationships without hanging dagre', () => {
    const text = renderToAscii(`
componentDiagram
  package "Foo" {
    [Bar]
  }
  [Bar] ..> [Foo] : parent
    `)

    expect(text).toContain('Foo')
    expect(text).toContain('Bar')
    expect(text).toContain('parent')
    expect(text).toMatch(/[╌┆]/)
    expect(text).toMatch(/[▲▼◀▶]/)
    expect(text.split('\n').length).toBeLessThanOrEqual(20)
  })

  it('renders reversed arrowheads from component relationships', () => {
    const text = renderToAscii(`
componentDiagram
  [Client] <-- [Server] : responds
    `)

    expect(text).toContain('Client')
    expect(text).toContain('Server')
    expect(text).toContain('responds')
    expect(text).toMatch(/[▲◀]/)
  })

  it('aligns vertical component edges with interface circles', () => {
    const text = renderToAscii(`
componentDiagram
  [standalone] --> renderFn : call with GraphicsIR
    `)
    const lines = text.split('\n')
    const arrowLine = lines.find(line => line.includes('▼')) || ''
    const circleLine = lines.find(line => line.includes('○')) || ''

    expect(text).toContain('standalone')
    expect(text).toContain('renderFn')
    expect(text).toContain('call with GraphicsIR')
    expect(arrowLine.indexOf('▼')).toBe(circleLine.indexOf('○'))
  })

  it('keeps child-to-external group relationships compact', () => {
    const text = renderToAscii(`
componentDiagram
  package "@pintora/diagrams" {
    [...Multiple Diagrams...] as diagrams
    [diagrams] --> IDiagram : implements
  }
    `)

    expect(text).toContain('@pintora/diagrams')
    expect(text).toContain('...Multiple Diagrams...')
    expect(text).toContain('IDiagram')
    expect(text).toContain('implements')
    expect(text).toMatch(/[▼▶]/)
    expect(text.split('\n').length).toBeLessThanOrEqual(11)
  })

  it('keeps component package internals compact with bottom padding', () => {
    const text = renderToAscii(`
componentDiagram
  package "@pintora/core" {
    () GraphicsIR
    () IRenderer
    () IDiagram
    [Diagram Registry] as registry
  }
  [IDiagram] --> GraphicsIR : generate
  [standalone] --> renderFn : call with GraphicsIR
    `)
    const lines = text.split('\n')
    const registryLine = lines.findIndex(line => line.includes('Diagram Registry'))
    const packageBottomLine = lines.findIndex(line => line.includes('┘') && line.includes('╌'))

    expect(text).toContain('@pintora/core')
    expect(text).toContain('generate')
    expect(text).toContain('call with GraphicsIR')
    expect(lines.length).toBeLessThanOrEqual(14)
    expect(packageBottomLine).toBeGreaterThan(registryLine + 1)
  })

  it('does not move target nodes out of their own groups when compacting cross-group edges', () => {
    const text = renderToAscii(`
componentDiagram
  package "@pintora/renderer" {
    () "render()" as renderFn
  }
  package "@pintora/standalone" {
    [standalone]
  }
  [standalone] --> renderFn : call with GraphicsIR
    `)
    const lines = text.split('\n')
    const rendererTopLine = lines.findIndex(line => line.includes('renderer'))
    const renderFnLine = lines.findIndex(line => line.includes('render()'))
    const rendererBottomLine = lines.findIndex(
      (line, index) => index > rendererTopLine && line.includes('┘') && line.includes('╌'),
    )

    expect(rendererTopLine).toBeGreaterThanOrEqual(0)
    expect(renderFnLine).toBeGreaterThan(rendererTopLine)
    expect(renderFnLine).toBeLessThan(rendererBottomLine)
  })

  it('renders package labels completely and joins relationship route corners', () => {
    const text = renderToAscii(`
componentDiagram
  package "@pintora/core" {
    () GraphicsIR
    () IRenderer
    () IDiagram
  }
  package "@pintora/diagrams" {
    [...Multiple Diagrams...] as diagrams
    [diagrams]
    [diagrams] --> IDiagram : implements
  }
  package "@pintora/renderer" {
    () "render()" as renderFn
    [SVGRender]
    [CanvasRender]
    [SVGRender] --> IRenderer : implements
    [CanvasRender] --> IRenderer : implements
    IRenderer ..> GraphicsIR : accepts
  }
    `)

    expect(text).toContain('@pintora/core')
    expect(text).toContain('@pintora/diagrams')
    expect(text).toContain('@pintora/renderer')
    expect(text).not.toMatch(/│─{2,}/)
    expect(text).not.toMatch(/─{2,}│/)
  })
})
