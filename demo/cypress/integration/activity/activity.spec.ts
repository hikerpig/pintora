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
  ])
})
