import { parse } from '../parser'
import { db } from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('sequence parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse unicode chars', () => {
    const backquoteExample = stripStartEmptyLines(`
sequenceDiagram
  autonumber
  用户->>Pintora: 帮我画张时序图
  activate Pintora
  alt DSL 正确
    Pintora->>用户: 返回绘制好的图表
  else DSL 有误
    Pintora->>用户: 返回报错信息
  end
  deactivate Pintora
`)
    parse(backquoteExample)
    const result = db.getDiagramIR()
    expect(result.messages.length).toBeGreaterThan(0)
    const messageTexts = result.messages.map(o => o.text).filter(s => Boolean(s))
    // console.log(messageTexts)
    expect(messageTexts).toMatchObject([
      '帮我画张时序图',
      'DSL 正确',
      '\b\b返回绘制好的图表',
      'DSL 有误',
      '\b\b返回报错信息',
    ])
  })

  it('can parse singleline note', () => {
    const backquoteExample = `sequenceDiagram
    @note right of User: singleline note
    `
    parse(backquoteExample)
    const result = db.getDiagramIR()
    // console.log('notes', result.notes)
    expect(result.notes.length).toEqual(1)
    expect(result.notes[0]).toMatchObject({
      text: 'singleline note',
    })
  })

  it('can parse multiline note', () => {
    const multilineNoteExample = stripStartEmptyLines(`
sequenceDiagram
  @note right of Pintora
  aaa note
  bbb
  @end_note
    `)
    parse(multilineNoteExample)
    const result = db.getDiagramIR()
    // console.log('notes', result.notes)
    expect(result.notes.length).toEqual(1)
    // parseMessage will trim text, so this may be somehow strange
    expect(result.notes[0]).toMatchObject({
      text: 'aaa note\n  bbb',
    })
  })

  it('can parse divider', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  Alice-->Bob: hello
  == 1 second later ==
  Bob-->Alice: hello there
  `)
    parse(example)
    const result = db.getDiagramIR()
    expect(result.messages.length).toEqual(3)
    expect(result.messages[1]).toMatchObject({
      text: '1 second later',
    })
  })

  it('should be correct when there is no char after divider', () => {
    const example = stripStartEmptyLines(`
  sequenceDiagram
    A->>B: m1
    == Divider ==`)
    parse(example)
    const result = db.getDiagramIR()
    // console.log('result', JSON.stringify(result, null, 2))
    expect(result.messages).toMatchObject([
      {
        from: 'A',
        to: 'B',
        text: 'm1',
        wrap: false,
        type: 0,
      },
      {
        text: 'Divider',
        wrap: false,
        type: 26,
      },
    ])
  })

  it('can parse participant', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  participant A as "Alice"
  participant B as "Bob"
  participant C
  A-->B: hello
  A-->C: yoho
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.actors).toMatchObject({
      A: {
        name: 'A',
        description: 'Alice',
        wrap: false,
        prevActorId: null,
        nextActorId: 'B',
      },
      B: {
        name: 'B',
        description: 'Bob',
        wrap: false,
        prevActorId: 'A',
        nextActorId: 'C',
      },
      C: {
        name: 'C',
        description: 'C',
        wrap: false,
        prevActorId: 'B',
      },
    })
    expect(ir.messages[0]).toMatchObject({
      from: 'A',
      to: 'B',
    })
    expect(ir.messages[1]).toMatchObject({
      from: 'A',
      to: 'C',
    })
  })

  it('can parse participant with classifier', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  participant [<actor> A]
  participant B as "[B]"
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.actors).toMatchObject({
      A: {
        name: 'A',
        description: 'A',
        wrap: false,
        prevActorId: null,
        classifier: 'actor',
        nextActorId: 'B',
      },
      B: {
        name: 'B',
        description: '[B]',
        wrap: false,
        prevActorId: 'A',
      },
    })
  })

  it('can parse multiline message', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  A-->B: hello\\nthere
  `)
    parse(example)
    const result = db.getDiagramIR()
    expect(result.messages[0]).toMatchObject({
      text: 'hello\nthere',
    })
  })

  it('keywords can appear in messages', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  A-->B: participant and title
  A-->B: parser is not 'par'
  `)
    parse(example)
    const result = db.getDiagramIR()
    expect(result.messages[0]).toMatchObject({
      text: 'participant and title',
    })
  })

  it('group', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  par DSL 正确
    A-->B: inside group
  end
  `)
    parse(example)
    const result = db.getDiagramIR()
    // console.log(JSON.stringify(result, null, 2))
    const messageList = result.messages.map(o => o.text)
    expect(messageList.slice(0, 2)).toMatchObject(['DSL 正确', 'inside group'])
  })

  it('group color', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  loop #e9f5dc can have color
    A-->B: inside group
    B-->C: second
  end
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.messages[0]).toMatchObject({
      text: 'can have color',
      attrs: {
        background: '#e9f5dc',
      },
    })
    expect(ir.messages[1]).toMatchObject({
      text: 'inside group',
    })
    expect(ir.messages[2]).toMatchObject({
      text: 'second',
    })
  })

  it('can parse activations', () => {
    const example = stripStartEmptyLines(`
  sequenceDiagram
    autonumber
    A->>B: m1
    activate A
    B->>A: m2
    deactivate A
  `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.messages).toMatchObject([
      {
        from: 'A',
        to: 'B',
        text: 'm1',
        wrap: false,
        type: 0,
      },
      {
        from: 'A',
        to: '',
        text: '',
        wrap: false,
        type: 17,
      },
      {
        from: 'B',
        to: 'A',
        text: 'm2',
        wrap: false,
        type: 0,
      },
      {
        from: 'A',
        to: '',
        text: '',
        wrap: false,
        type: 18,
      },
    ])
  })

  it('can parse activations with plus/minus token', () => {
    const example = stripStartEmptyLines(`
  sequenceDiagram
    A-->>+B: m1
    A-->>-B: m2
  `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.messages).toMatchObject([
      {
        from: 'A',
        to: 'B',
        text: 'm1',
        wrap: false,
        type: 1,
      },
      {
        from: 'B',
        to: '',
        text: '',
        wrap: false,
        type: 17,
      },
      {
        from: 'A',
        to: 'B',
        text: 'm2',
        wrap: false,
        type: 1,
      },
      {
        from: 'B',
        to: '',
        text: '',
        wrap: false,
        type: 18,
      },
    ])
  })

  it('can parse alt/else', () => {
    const example = stripStartEmptyLines(`
  sequenceDiagram
    alt #ccdd77 Success
      A-->B: Congrats!
    else #ff6666 Fail
      A-->B: error handling
    end
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.messages).toMatchObject([
      {
        text: 'Success',
        wrap: false,
        type: 12,
        attrs: {
          background: '#ccdd77',
        },
      },
      {
        from: 'A',
        to: 'B',
        text: 'Congrats!',
        wrap: false,
        type: 6,
      },
      {
        text: 'Fail',
        wrap: false,
        type: 13,
        attrs: {
          background: '#ff6666',
        },
      },
      {
        from: 'A',
        to: 'B',
        text: 'error handling',
        wrap: false,
        type: 6,
      },
      {
        text: '',
        wrap: false,
        type: 14,
      },
    ])
  })

  it('can parse par/and', () => {
    const example = stripStartEmptyLines(`
  sequenceDiagram
    par #ccdd77 Success
      A-->B: m1
    and #ff6666 Fail
      A-->B: m2
    end
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.messages).toMatchObject([
      {
        text: 'Success',
        wrap: false,
        type: 19,
        attrs: {
          background: '#ccdd77',
        },
      },
      {
        from: 'A',
        to: 'B',
        text: 'm1',
        wrap: false,
        type: 6,
      },
      {
        text: 'Fail',
        wrap: false,
        type: 20,
        attrs: {
          background: '#ff6666',
        },
      },
      {
        from: 'A',
        to: 'B',
        text: 'm2',
        wrap: false,
        type: 6,
      },
      {
        text: '',
        wrap: false,
        type: 21,
      },
    ])
  })

  it('should be correct when there is blank line inside par', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  par Success
    A-->B: m1

  end
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.messages).toMatchObject([
      {
        text: 'Success',
        wrap: false,
        type: 19,
        attrs: {
          background: null,
        },
      },
      {
        from: 'A',
        to: 'B',
        text: 'm1',
        wrap: false,
        type: 6,
      },
      {
        text: '',
        wrap: false,
        type: 21,
      },
    ])
  })

  it('can parse style clause', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  @style noteTextColor #00bbaa
  @style messageFontSize 20
  `)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log(JSON.stringify(ir, null, 2))
    expect(ir.styleParams).toMatchObject([
      {
        key: 'noteTextColor',
        value: '#00bbaa',
      },
      {
        key: 'messageFontSize',
        value: '20',
      },
    ])
  })

  it('can parse style clause inside brackets', () => {
    const example = stripStartEmptyLines(`
sequenceDiagram
  @style {
    noteTextColor #00bbaa
    messageFontSize 20
  }
  `)
    parse(example)
    const ir = db.getDiagramIR()
    expect(ir.styleParams).toMatchObject([
      {
        key: 'noteTextColor',
        value: '#00bbaa',
      },
      {
        key: 'messageFontSize',
        value: '20',
      },
    ])
  })
})
