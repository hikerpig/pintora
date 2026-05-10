import { buildEntityBoxes } from '../ascii/entity-layout'
import { placeRankedEntities, rankEntities } from '../ascii/rank-layout'
import { Cardinality, Identification, type ErDiagramIR } from '../db'

const sample: ErDiagramIR = {
  title: '',
  configParams: [],
  overrideConfig: {},
  entities: {
    PERSON: {
      name: 'PERSON',
      attributes: [{ attributeType: 'string', attributeName: 'phone', comment: 'phone number' }],
    },
    CUSTOMER: { name: 'CUSTOMER', attributes: [] },
    DELIVERER: { name: 'DELIVERER', attributes: [] },
    ORDER: {
      name: 'ORDER',
      attributes: [
        { attributeType: 'int', attributeName: 'order_number', attributeKey: 'PK' },
        { attributeType: 'string', attributeName: 'adress', comment: 'delivery address' },
      ],
    },
    'LINE-ITEM': { name: 'LINE-ITEM', attributes: [] },
    'DELIVERY-ADDRESS': { name: 'DELIVERY-ADDRESS', attributes: [] },
    DELIVERY: { name: 'DELIVERY', attributes: [] },
  },
  inheritances: [
    { sup: 'PERSON', sub: 'CUSTOMER' },
    { sup: 'PERSON', sub: 'DELIVERER' },
  ],
  relationships: [
    {
      entityA: 'CUSTOMER',
      entityB: 'ORDER',
      roleA: 'places',
      relSpec: { cardA: Cardinality.ZERO_OR_MORE, cardB: Cardinality.ONLY_ONE, relType: Identification.IDENTIFYING },
    },
    {
      entityA: 'ORDER',
      entityB: 'LINE-ITEM',
      roleA: 'contains',
      relSpec: { cardA: Cardinality.ONE_OR_MORE, cardB: Cardinality.ONLY_ONE, relType: Identification.IDENTIFYING },
    },
    {
      entityA: 'CUSTOMER',
      entityB: 'DELIVERY-ADDRESS',
      roleA: 'uses',
      relSpec: {
        cardA: Cardinality.ONE_OR_MORE,
        cardB: Cardinality.ONE_OR_MORE,
        relType: Identification.NON_IDENTIFYING,
      },
    },
    {
      entityA: 'DELIVERER',
      entityB: 'DELIVERY',
      roleA: 'completes',
      relSpec: { cardA: Cardinality.ZERO_OR_MORE, cardB: Cardinality.ONLY_ONE, relType: Identification.IDENTIFYING },
    },
  ],
}

describe('ER ASCII rank layout', () => {
  it('places subtypes before supertypes and relationship targets after sources', () => {
    const ranked = rankEntities(sample, buildEntityBoxes(sample))
    const byId = Object.fromEntries(ranked.map(box => [box.id, box]))

    expect(byId.CUSTOMER.rank).toBeLessThan(byId.PERSON.rank)
    expect(byId.DELIVERER.rank).toBeLessThan(byId.PERSON.rank)
    expect(byId.CUSTOMER.rank).toBeLessThanOrEqual(byId.ORDER.rank)
    expect(byId.ORDER.rank).toBeLessThanOrEqual(byId['LINE-ITEM'].rank)
  })

  it('assigns non-overlapping coordinates with enough connector space between ranks', () => {
    const layout = placeRankedEntities(rankEntities(sample, buildEntityBoxes(sample)), { title: '' })

    for (const a of layout.entities) {
      for (const b of layout.entities) {
        if (a.id >= b.id) continue
        const overlaps = a.left <= b.right && b.left <= a.right && a.top <= b.bottom && b.top <= a.bottom
        expect(overlaps).toBe(false)
      }
    }
    expect(layout.width).toBeLessThanOrEqual(120)
  })
})
