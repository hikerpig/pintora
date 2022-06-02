import { EXAMPLES, stripStartEmptyLines } from '@pintora/test-shared'
import { pintoraStandalone } from '@pintora/standalone'
import { makeSnapshotCases, startRender } from '../test-utils/render'

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
        c.get('.er__entity-box', { timeout: 1000 })
          .should('exist')
          .then($ele => {
            const ele = $ele[0]
            const doc = (ele as unknown as SVGPathElement).ownerSVGElement
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

  it('recognize event on entity', () => {
    const code = EXAMPLES.er.code
    const c = startRender({ code })
    c.get('.er__entity-box').should('exist')
    let handlerTriggered = false
    c.window().then(win => {
      const pintora = (win as any).pintora as typeof pintoraStandalone
      pintora.diagramEventManager.once('click', evt => {
        handlerTriggered = true
        expect(evt.item.diagram).to.equal('er')
        expect(evt.item.type).to.equal('entity')
        expect(evt.item.id).to.equal(evt.item.data.itemId)
      })
    })
    c.get('.er__entity:first')
      .click()
      .wait(10)
      .then(() => {
        expect(handlerTriggered).to.eq(true)
      })
  })
})
