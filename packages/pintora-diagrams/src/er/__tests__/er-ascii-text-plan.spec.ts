import { renderTextDiagramPlan } from '@pintora/renderer/renderers/ascii/text-plan-renderer'
import { toErTextDiagramPlan } from '../ascii'
import { erLayoutToTextDiagramPlan } from '../ascii/text-plan'
import { Cardinality, Identification } from '../db'
import type { ErAsciiEntityBox, ErAsciiLayout } from '../ascii/types'

function entityBox(id: string, x: number, y: number): ErAsciiEntityBox {
  return {
    id,
    entity: { name: id, attributes: [] },
    rank: 0,
    order: 0,
    x,
    y,
    width: 5,
    height: 3,
    centerX: x + 2,
    centerY: y + 1,
    top: y,
    right: x + 4,
    bottom: y + 2,
    left: x,
    attributes: [],
  }
}

describe('toErTextDiagramPlan', () => {
  it('renders relationship connectors instead of a relationship text legend', () => {
    const plan = toErTextDiagramPlan({
      title: '',
      configParams: [],
      overrideConfig: {},
      entities: {
        CUSTOMER: { name: 'CUSTOMER', attributes: [] },
        ORDER: {
          name: 'ORDER',
          attributes: [{ attributeType: 'int', attributeName: 'order_number', attributeKey: 'PK' }],
        },
      },
      inheritances: [],
      relationships: [
        {
          entityA: 'CUSTOMER',
          entityB: 'ORDER',
          roleA: 'places',
          relSpec: { cardA: 'ZERO_OR_MORE' as any, cardB: 'ONLY_ONE' as any, relType: 'IDENTIFYING' as any },
        },
      ],
    })

    const text = renderTextDiagramPlan(plan)

    expect(text).toContain('CUSTOMER')
    expect(text).toContain('ORDER')
    expect(text).toContain('places')
    expect(text).toContain('│')
    expect(text).toContain('○╟')
    expect(text).toMatch(/[─│┼┬┴├┤]/)
    expect(text).not.toContain('CUSTOMER ||--o{ ORDER : places')
  })

  it('renders inheritance with an ISA label and open triangle head', () => {
    const plan = toErTextDiagramPlan({
      title: '',
      configParams: [],
      overrideConfig: {},
      entities: {
        PERSON: { name: 'PERSON', attributes: [] },
        CUSTOMER: { name: 'CUSTOMER', attributes: [] },
      },
      inheritances: [{ sup: 'PERSON', sub: 'CUSTOMER' }],
      relationships: [],
    })

    const text = renderTextDiagramPlan(plan)

    expect(text).toContain('PERSON')
    expect(text).toContain('CUSTOMER')
    expect(text).toContain('ISA')
    expect(text).toMatch(/[△▽◁▷]/)
    expect(text).not.toContain('CUSTOMER inherit PERSON')
  })

  it('renders non-identifying relationships with dashed connector segments', () => {
    const plan = toErTextDiagramPlan({
      title: '',
      configParams: [],
      overrideConfig: {},
      entities: {
        CUSTOMER: { name: 'CUSTOMER', attributes: [] },
        ADDRESS: { name: 'ADDRESS', attributes: [] },
      },
      inheritances: [],
      relationships: [
        {
          entityA: 'CUSTOMER',
          entityB: 'ADDRESS',
          roleA: 'uses',
          relSpec: { cardA: 'ONE_OR_MORE' as any, cardB: 'ONE_OR_MORE' as any, relType: 'NON_IDENTIFYING' as any },
        },
      ],
    })

    const text = renderTextDiagramPlan(plan)

    expect(text).toContain('uses')
    expect(text).toContain('╟')
    expect(text).toContain('╢')
    expect(text).toMatch(/[╌┆]/)
  })

  it('aligns ER cardinality markers with horizontal relationship endpoints', () => {
    const pairs = [
      ['A', 'B', 'one-to-one', Cardinality.ONLY_ONE, Cardinality.ONLY_ONE],
      ['C', 'D', 'one-to-many', Cardinality.ONLY_ONE, Cardinality.ZERO_OR_MORE],
      ['E', 'F', 'opt-to-many', Cardinality.ZERO_OR_ONE, Cardinality.ONE_OR_MORE],
      ['G', 'H', 'many-to-many', Cardinality.ONE_OR_MORE, Cardinality.ZERO_OR_MORE],
      ['I', 'J', 'zero-to-opt', Cardinality.ZERO_OR_MORE, Cardinality.ZERO_OR_ONE],
    ] as const

    const layout: ErAsciiLayout = {
      width: 16,
      height: 19,
      entities: pairs.flatMap(([sourceId, targetId], index) => [
        entityBox(sourceId, 0, index * 4),
        entityBox(targetId, 11, index * 4),
      ]),
      relationships: pairs.map(([sourceId, targetId, label, cardAtSource, cardAtTarget], index) => {
        const y = index * 4 + 1
        return {
          kind: 'relationship',
          sourceId,
          targetId,
          label,
          cardAtSource,
          cardAtTarget,
          identification: Identification.IDENTIFYING,
          route: [
            { x: 5, y },
            { x: 10, y },
          ],
          labelPoint: { x: 7, y: y + 1 },
        }
      }),
      inheritances: [],
    }

    const text = renderTextDiagramPlan(erLayoutToTextDiagramPlan(layout))

    expect(text).toContain('│ A ││────││ B │')
    expect(text).toContain('│ C ││───○╟│ D │')
    expect(text).toContain('│ E │○│───╟│ F │')
    expect(text).toContain('│ G │╢───○╟│ H │')
    expect(text).toContain('│ I │╢○──○││ J │')
  })
})
