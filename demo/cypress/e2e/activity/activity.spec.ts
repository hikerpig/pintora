/// <reference types="@percy/cypress" />
import { stripStartEmptyLines } from '@pintora/test-shared'
import { makeSnapshotCases } from '../test-utils/render'

describe('Activity Diagram', () => {
  makeSnapshotCases([
    {
      description: 'Should render nested groups correctly',
      code: stripStartEmptyLines(`
activityDiagram
start
partition Outer {
  if (diagram registered ?) then
    :get implementation;
  else (no)
    :print error;
  endif

  group Inner {
    while (data available?) is (available)
      :read data;
    endwhile (no)
  }
  :some action;
}
end`),
      onRender(c) {
        c.get('.activity__group-rect').should('exist')
      },
    },
    {
      description: 'Should render early end correctly',
      code: stripStartEmptyLines(`
  activityDiagram
  if (diagram registered ?) then
    :get implementation;
  else (no)
    :print error;
    end
  endif
  switch ( renderer type )
  case ( svg )
    :Generate svg;
  case ( canvas )
    :Draw canvas;
  case ( custom )
    :Custom renderer output;
  case ( unregistered )
    end
  endswitch
  end`),
      onRender(c) {
        c.get('.activity__keyword').should('exist')
      },
    },
    {
      description: 'Should render fork branch with detach',
      code: stripStartEmptyLines(`
  activityDiagram
  fork
    :action 1;
  forkagain
    :action 2;
    kill
  endfork`),
      existSelectors: ['.activity__keyword'],
    },
    {
      // issue #169
      description: 'Should render fork inside group correctly',
      code: stripStartEmptyLines(`
  activityDiagram
  title: Fork inside group test
  start
  group Group {
    fork
      :a;
    forkagain
      :b;
    endfork
  }
  end`),
      existSelectors: ['.activity__keyword'],
    },
  ])
})
