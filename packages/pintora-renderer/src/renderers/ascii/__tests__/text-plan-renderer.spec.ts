import type { TextDiagramPlan } from '@pintora/core'
import { renderTextDiagramPlan } from '../text-plan-renderer'

describe('renderTextDiagramPlan', () => {
  it('renders text, rectangles, fills, dashed lines, and arrowheads from generic ops', () => {
    const plan: TextDiagramPlan = {
      width: 24,
      height: 8,
      ops: [
        { type: 'rect', x: 0, y: 0, width: 10, height: 3 },
        { type: 'text', x: 5, y: 1, text: 'User', align: 'center' },
        { type: 'line', from: { x: 2, y: 5 }, to: { x: 16, y: 5 }, stroke: 'dashed', endHead: 'open' },
        { type: 'line', from: { x: 18, y: 1 }, to: { x: 18, y: 5 }, stroke: 'solid', endHead: 'filled' },
        { type: 'fill', x: 20, y: 2, width: 1, height: 3, char: '|' },
      ],
    }

    const text = renderTextDiagramPlan(plan)

    expect(text).toContain('┌────────┐')
    expect(text).toContain('│  User  │')
    expect(text).toContain('╌')
    expect(text).toContain('▷')
    expect(text).toContain('▼')
    expect(text).toContain('|')
  })

  it('rejects non-axis-aligned lines because v1 only supports horizontal and vertical lines', () => {
    const plan: TextDiagramPlan = {
      width: 8,
      height: 4,
      ops: [{ type: 'line', from: { x: 0, y: 0 }, to: { x: 3, y: 2 } }],
    }

    expect(() => renderTextDiagramPlan(plan)).toThrow('TextDiagramPlan line ops must be axis-aligned')
  })
})
