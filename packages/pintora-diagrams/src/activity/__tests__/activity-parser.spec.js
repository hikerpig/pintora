import { parse } from '../parser'
import { db } from '../db'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('activity parser', () => {
  afterEach(() => {
    db.clear()
  })

  it('can parse action', () => {
    const example = stripStartEmptyLines(`
activityDiagram
:simple action;
:multiline
 action;
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    const actions = ir.steps.map(step => step.value)
    expect(actions).toMatchObject([
      {
        actionType: 'normal',
        message: 'simple action',
      },
      {
        actionType: 'normal',
        message: 'multiline\n action',
      },
    ])
  })

  it('can parse conditions', () => {
    const example = stripStartEmptyLines(`
activityDiagram
if (diagram registered ?) then
  :get implementation;
else (no)
  :print error;
endif
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.steps[0]).toMatchObject({
      type: 'condition',
      value: {
        message: 'diagram registered ?',
        then: {
          children: [
            {
              type: 'action',
              value: {
                actionType: 'normal',
                message: 'get implementation',
              },
            },
          ],
        },
        else: {
          children: [
            {
              type: 'action',
              value: {
                actionType: 'normal',
                message: 'print error',
              },
            },
          ],
        },
      },
    })
  })

  it('can parse while loops', () => {
    const example = stripStartEmptyLines(`
activityDiagram
while (data available)
  :read data;
  :generate diagrams;
endwhile
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.steps[0]).toMatchObject({
      type: 'while',
      value: {
        message: 'data available',
        children: [
          {
            type: 'action',
            value: {
              actionType: 'normal',
              message: 'read data',
            },
          },
          {
            type: 'action',
            value: {
              actionType: 'normal',
              message: 'generate diagrams',
            },
          },
        ],
      },
    })
  })

  it('can parse keywords', () => {
    const example = stripStartEmptyLines(`
activityDiagram
start
end
`)
    parse(example)
    const ir = db.getDiagramIR()
    const keywords = ir.steps.map(step => step.value.label)
    expect(keywords).toMatchObject(['start', 'end'])
  })

  it('can parse group', () => {
    const example = stripStartEmptyLines(`
activityDiagram
partition Init {
  :read config;
  :init internal services;
}
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.steps[0]).toMatchObject({
      type: 'group',
      value: {
        id: '1',
        type: 'group',
        name: 'Init',
        groupType: 'partition',
        label: 'Init',
        children: [
          {
            type: 'action',
            value: {
              actionType: 'normal',
              message: 'read config',
              id: '2',
            },
          },
          {
            type: 'action',
            value: {
              actionType: 'normal',
              message: 'init internal services',
              id: '3',
            },
          },
        ],
      },
    })
  })

  it('can parse notes', () => {
    const example = stripStartEmptyLines(`
activityDiagram
:do something;
@note right
message here
@end_note
:step 2;
note left: message 2
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.steps).toMatchObject([
      {
        type: 'action',
        value: {
          actionType: 'normal',
          message: 'do something',
          id: '1',
        },
      },
      {
        type: 'action',
        value: {
          actionType: 'normal',
          message: 'step 2',
          id: '3',
        },
      },
    ])
    expect(ir.notes).toMatchObject([
      {
        id: '2',
        type: 'note',
        placement: 'right',
        text: 'message here',
        target: '1',
      },
      {
        id: '4',
        type: 'note',
        placement: 'left',
        text: 'message 2',
        target: '3',
      },
    ])
  })
  it('can parse while-loops inside group', () => {
    const example = stripStartEmptyLines(`
activityDiagram
partition #aabb88 Inner {
  while (data available?) is (available)
    :read data;
  endwhile (no)
}
end
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.steps[0]).toMatchObject({
      type: 'group',
      value: {
        id: '1',
        type: 'group',
        name: 'Inner',
        groupType: 'partition',
        label: 'Inner',
        background: '#aabb88',
        children: [
          {
            type: 'while',
            value: {
              id: '2',
              message: 'data available?',
              children: [
                {
                  type: 'action',
                  value: {
                    actionType: 'normal',
                    message: 'read data',
                    id: '3',
                  },
                  parentId: '2',
                },
              ],
              confirmLabel: 'available',
              denyLabel: 'no',
            },
            parentId: '1',
          },
        ],
      },
    })
  })

  it('can parse conditions inside group', () => {
    const example = stripStartEmptyLines(`
activityDiagram
group Init {
  if (diagram registered ?) then
    :get implementation;
  else (no)
    :print error;
  endif
}
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.steps[0].value.children).toMatchObject([
      {
        type: 'condition',
        value: {
          id: '2',
          message: 'diagram registered ?',
          then: {
            children: [
              {
                type: 'action',
                value: {
                  actionType: 'normal',
                  message: 'get implementation',
                  id: '3',
                },
                parentId: '2',
              },
            ],
          },
          else: {
            children: [
              {
                type: 'action',
                value: {
                  actionType: 'normal',
                  message: 'print error',
                  id: '4',
                },
                parentId: '2',
              },
            ],
          },
        },
        parentId: '1',
      },
    ])
  })

  it('can parse nested groups', () => {
    const example = stripStartEmptyLines(`
activityDiagram
group Init {
  partition Inner {
    :Text;
  }
}
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.steps[0]).toMatchObject({
      type: 'group',
      value: {
        id: '1',
        type: 'group',
        name: 'Init',
        groupType: 'group',
        label: 'Init',
        background: null,
        children: [
          {
            type: 'group',
            value: {
              id: '2',
              type: 'group',
              name: 'Inner',
              groupType: 'partition',
              label: 'Inner',
              background: null,
              children: [
                {
                  type: 'action',
                  value: {
                    actionType: 'normal',
                    message: 'Text',
                    id: '3',
                  },
                  parentId: '2',
                },
              ],
              parent: 'Init',
            },
            parentId: '1',
          },
        ],
      },
    })
  })

  it('can parse switch case sentence', () => {
    const example = stripStartEmptyLines(`
activityDiagram
  switch (test?) 
  case ( condition A ) 
    :Text 1;
  case ( condition B )
    :Text 2;
    :Text 3; 
  endswitch
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.steps[0]).toMatchObject({
      type: 'switch',
      value: {
        id: '1',
        message: 'test?',
        children: [
          {
            type: 'case',
            value: {
              id: '2',
              confirmLabel: 'condition A',
              children: [
                {
                  type: 'action',
                  value: {
                    actionType: 'normal',
                    message: 'Text 1',
                    id: '3',
                  },
                  parentId: '2',
                },
              ],
            },
            parentId: '1',
          },
          {
            type: 'case',
            value: {
              id: '4',
              confirmLabel: 'condition B',
              children: [
                {
                  type: 'action',
                  value: {
                    actionType: 'normal',
                    message: 'Text 2',
                    id: '5',
                  },
                  parentId: '4',
                },
                {
                  type: 'action',
                  value: {
                    actionType: 'normal',
                    message: 'Text 3',
                    id: '6',
                  },
                  parentId: '4',
                },
              ],
            },
            parentId: '1',
          },
        ],
      },
    })
  })

  it('can parse arrow statement', () => {
    const example = stripStartEmptyLines(`
activityDiagram
  :Text 1;
  -> Arrow label;
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir).toMatchObject({
      steps: [
        {
          type: 'action',
          value: {
            actionType: 'normal',
            message: 'Text 1',
            id: '1',
          },
        },
      ],
      arrowLabels: [
        {
          id: '2',
          type: 'arrowLabel',
          text: 'Arrow label',
          target: '1',
        },
      ],
    })
  })

  it('can parse fork sentence', () => {
    const example = stripStartEmptyLines(`
activityDiagram
  fork
    :action 1;
  forkagain
    :action 2;
  endfork
`)
    parse(example)
    const ir = db.getDiagramIR()
    // console.log('ir', JSON.stringify(ir, null, 2))
    expect(ir.steps).toMatchObject([
      {
        type: 'fork',
        value: {
          id: '1',
          branches: [
            {
              type: 'forkBranch',
              value: {
                id: '2',
                children: [
                  {
                    type: 'action',
                    value: {
                      actionType: 'normal',
                      message: 'action 1',
                      id: '3',
                    },
                    parentId: '2',
                  },
                ],
              },
              parentId: '1',
            },
            {
              type: 'forkBranch',
              value: {
                id: '4',
                children: [
                  {
                    type: 'action',
                    value: {
                      actionType: 'normal',
                      message: 'action 2',
                      id: '5',
                    },
                    parentId: '4',
                  },
                ],
              },
              parentId: '1',
            },
          ],
        },
      },
    ])
  })
})
