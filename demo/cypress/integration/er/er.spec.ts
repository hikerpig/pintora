import { stripStartEmptyLines } from '@pintora/test-shared'
import { makeSnapshotCases } from '../test-utils/render'

describe('ER Diagram', () => {
  makeSnapshotCases([
    {
      description: 'Should render ortho edges and layoutDirection BT',
      code: stripStartEmptyLines(`
erDiagram
  @param layoutDirection BT
  @param edgeType ortho

  A ||--o{ B : "a1"
  B ||--o{ C : "b1"
  C ||--o{ A : "c1" 
  C ||--o{ B : "c2" 
`),
      onRender(c) {
        c.document().then(doc => {
          const entityA = doc.getElementById('entity-A')
          const entityB = doc.getElementById('entity-B')
          expect(entityA.getBoundingClientRect().y).to.greaterThan(entityB.getBoundingClientRect().y)

          const labels = Array.from(doc.querySelectorAll('.er__relationship-label').values())
          const b1Ele = labels.find(ele => ele.textContent === 'b1') as SVGTextElement
          const c2Ele = labels.find(ele => ele.textContent === 'c2') as SVGTextElement
          expect(c2Ele.getBBox().x).to.greaterThan(b1Ele.getBBox().x)
        })
      },
    },
  ])
})
