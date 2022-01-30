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
  group Inner {
    while (data available?) is (available)
      :read data;
    endwhile (no)
  }
  :some action;
}
end`),
      onRender(c) {
        c.get('.component__group-rect').should('exist')
      },
    },
  ])
})
