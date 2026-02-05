import { calcTextPosition, calcTextBound, MARK_BOUND_CALCULATORS, calcBound } from '../bound'

// Mock calculateTextDimensions
jest.mock('@pintora/core', () => ({
  ...jest.requireActual('@pintora/core'),
  calculateTextDimensions: jest.fn().mockReturnValue({ width: 100, height: 20 }),
}))

const { calculateTextDimensions } = jest.requireMock('@pintora/core')

describe('calcTextPosition', () => {
  const width = 100
  const height = 20
  const x = 50
  const y = 30

  describe('textAlign', () => {
    it('should handle left align (default)', () => {
      const result = calcTextPosition(x, y, width, height, 'left', 'top')
      expect(result.left).toBe(x)
    })

    it('should handle center align', () => {
      const result = calcTextPosition(x, y, width, height, 'center', 'top')
      expect(result.left).toBe(x - width / 2)
    })

    it('should handle right align', () => {
      const result = calcTextPosition(x, y, width, height, 'right', 'top')
      expect(result.left).toBe(x - width)
    })

    it('should handle end align (same as right)', () => {
      const result = calcTextPosition(x, y, width, height, 'end', 'top')
      expect(result.left).toBe(x - width)
    })
  })

  describe('textBaseline', () => {
    it('should handle top baseline', () => {
      const result = calcTextPosition(x, y, width, height, 'left', 'top')
      expect(result.top).toBe(y)
    })

    it('should handle hanging baseline (same as top)', () => {
      const result = calcTextPosition(x, y, width, height, 'left', 'hanging')
      expect(result.top).toBe(y)
    })

    it('should handle middle baseline', () => {
      const result = calcTextPosition(x, y, width, height, 'left', 'middle')
      expect(result.top).toBe(y - height / 2)
    })

    it('should handle bottom baseline', () => {
      const result = calcTextPosition(x, y, width, height, 'left', 'bottom')
      expect(result.top).toBe(y - height)
    })

    it('should handle alphabetic baseline (default)', () => {
      const result = calcTextPosition(x, y, width, height, 'left', 'alphabetic')
      expect(result.top).toBe(y - height)
    })

    it('should handle ideographic baseline (same as alphabetic)', () => {
      const result = calcTextPosition(x, y, width, height, 'left', 'ideographic')
      expect(result.top).toBe(y - height)
    })

    it('should use default baseline when not specified', () => {
      const result = calcTextPosition(x, y, width, height, 'left')
      expect(result.top).toBe(y - height)
    })
  })

  describe('default parameters', () => {
    it('should use default textAlign and textBaseline when not provided', () => {
      const result = calcTextPosition(x, y, width, height)
      expect(result.left).toBe(x)
      expect(result.top).toBe(y - height)
    })
  })
})

describe('calcTextBound', () => {
  beforeEach(() => {
    calculateTextDimensions.mockReturnValue({ width: 100, height: 20 })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should calculate bounds with default alignment', () => {
    const textMark = {
      type: 'text',
      attrs: {
        x: 50,
        y: 30,
        text: 'Hello',
      },
    }

    const result = calcTextBound(textMark, { fontSize: 14, fontFamily: 'sans-serif' })

    expect(result.left).toBe(50)
    expect(result.top).toBe(10) // y - height = 30 - 20
    expect(result.right).toBe(150) // left + width = 50 + 100
    expect(result.bottom).toBe(30) // top + height = 10 + 20
    expect(result.width).toBe(100)
    expect(result.height).toBe(20)
  })

  it('should calculate bounds with center alignment', () => {
    const textMark = {
      type: 'text',
      attrs: {
        x: 50,
        y: 30,
        text: 'Hello',
        textAlign: 'center',
        textBaseline: 'middle',
      },
    }

    const result = calcTextBound(textMark, { fontSize: 14, fontFamily: 'sans-serif' })

    expect(result.left).toBe(0) // x - width/2 = 50 - 50
    expect(result.top).toBe(20) // y - height/2 = 30 - 10
    expect(result.right).toBe(100) // left + width = 0 + 100
    expect(result.bottom).toBe(40) // top + height = 20 + 20
  })

  it('should calculate bounds with right alignment', () => {
    const textMark = {
      type: 'text',
      attrs: {
        x: 50,
        y: 30,
        text: 'Hello',
        textAlign: 'right',
      },
    }

    const result = calcTextBound(textMark, { fontSize: 14, fontFamily: 'sans-serif' })

    expect(result.left).toBe(-50) // x - width = 50 - 100
    expect(result.right).toBe(50) // left + width = -50 + 100
  })

  it('should handle empty text', () => {
    const textMark = {
      type: 'text',
      attrs: {
        x: 50,
        y: 30,
        text: '',
      },
    }

    calculateTextDimensions.mockReturnValue({ width: 0, height: 0 })

    const result = calcTextBound(textMark, { fontSize: 14, fontFamily: 'sans-serif' })

    expect(result.left).toBe(50)
    expect(result.top).toBe(30)
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })

  it('should use default x and y when not provided', () => {
    const textMark = {
      type: 'text',
      attrs: {
        text: 'Hello',
      },
    }

    const result = calcTextBound(textMark, { fontSize: 14, fontFamily: 'sans-serif' })

    expect(result.left).toBe(0)
    expect(result.top).toBe(-20) // 0 - height
  })

  it('should pass fontConfig to calculateTextDimensions', () => {
    const textMark = {
      type: 'text',
      attrs: {
        x: 50,
        y: 30,
        text: 'Hello',
      },
    }

    const fontConfig = { fontSize: 16, fontFamily: 'Arial', fontWeight: 'bold' }
    calcTextBound(textMark, fontConfig)

    expect(calculateTextDimensions).toHaveBeenCalledWith('Hello', fontConfig)
  })
})

describe('MARK_BOUND_CALCULATORS', () => {
  describe('text', () => {
    it('should calculate bounds using attrs.width and attrs.height', () => {
      const textMark = {
        type: 'text',
        attrs: {
          x: 50,
          y: 30,
          width: 100,
          height: 20,
          text: 'Hello',
          textAlign: 'center',
          textBaseline: 'middle',
        },
      }

      const result = MARK_BOUND_CALCULATORS.text(textMark)

      expect(result.left).toBe(0) // x - width/2 = 50 - 50
      expect(result.top).toBe(20) // y - height/2 = 30 - 10
      expect(result.right).toBe(100) // left + width = 0 + 100
      expect(result.bottom).toBe(40) // top + height = 20 + 20
    })

    it('should handle default values when attrs are not provided', () => {
      const textMark = {
        type: 'text',
        attrs: {
          text: 'Hello',
        },
      }

      const result = MARK_BOUND_CALCULATORS.text(textMark)

      expect(result.left).toBe(0)
      expect(result.top).toBe(0) // 0 - 0 = 0
      expect(result.right).toBe(0)
      expect(result.bottom).toBe(0)
    })
  })

  describe('rect', () => {
    it('should calculate rect bounds', () => {
      const rectMark = {
        type: 'rect',
        attrs: {
          x: 10,
          y: 20,
          width: 100,
          height: 50,
        },
      }

      const result = MARK_BOUND_CALCULATORS.rect(rectMark)

      expect(result.left).toBe(10)
      expect(result.right).toBe(110)
      expect(result.top).toBe(20)
      expect(result.bottom).toBe(70)
    })
  })

  describe('circle', () => {
    it('should calculate circle bounds', () => {
      const circleMark = {
        type: 'circle',
        attrs: {
          x: 50,
          y: 50,
          r: 25,
        },
      }

      const result = MARK_BOUND_CALCULATORS.circle(circleMark)

      expect(result.left).toBe(25)
      expect(result.right).toBe(75)
      expect(result.top).toBe(25)
      expect(result.bottom).toBe(75)
    })
  })

  describe('ellipse', () => {
    it('should calculate ellipse bounds', () => {
      const ellipseMark = {
        type: 'ellipse',
        attrs: {
          cx: 50,
          cy: 50,
          rx: 30,
          ry: 20,
        },
      }

      const result = MARK_BOUND_CALCULATORS.ellipse(ellipseMark)

      expect(result.left).toBe(20)
      expect(result.right).toBe(80)
      expect(result.bottom).toBe(30)
      expect(result.top).toBe(70)
    })
  })

  describe('line', () => {
    it('should calculate line bounds', () => {
      const lineMark = {
        type: 'line',
        attrs: {
          x1: 10,
          y1: 20,
          x2: 100,
          y2: 80,
        },
      }

      const result = MARK_BOUND_CALCULATORS.line(lineMark)

      expect(result.left).toBe(10)
      expect(result.right).toBe(100)
      expect(result.top).toBe(20)
      expect(result.bottom).toBe(80)
    })

    it('should handle line with reversed coordinates', () => {
      const lineMark = {
        type: 'line',
        attrs: {
          x1: 100,
          y1: 80,
          x2: 10,
          y2: 20,
        },
      }

      const result = MARK_BOUND_CALCULATORS.line(lineMark)

      expect(result.left).toBe(10)
      expect(result.right).toBe(100)
      expect(result.top).toBe(20)
      expect(result.bottom).toBe(80)
    })
  })

  describe('path', () => {
    it('should return empty bounds for path', () => {
      const pathMark = {
        type: 'path',
        attrs: {
          path: [],
        },
      }

      const result = MARK_BOUND_CALCULATORS.path(pathMark)

      // makeBounds returns Infinity values for empty bounds
      expect(result.left).toBe(Infinity)
      expect(result.right).toBe(-Infinity)
      expect(result.top).toBe(Infinity)
      expect(result.bottom).toBe(-Infinity)
    })
  })
})

describe('calcBound', () => {
  it('should calculate bounds for multiple marks', () => {
    const marks = [
      {
        type: 'rect',
        attrs: { x: 0, y: 0, width: 100, height: 50 },
      },
      {
        type: 'circle',
        attrs: { x: 150, y: 75, r: 25 },
      },
    ]

    const result = calcBound(marks)

    expect(result.left).toBe(0)
    expect(result.top).toBe(0)
    expect(result.right).toBe(175)
    expect(result.bottom).toBe(100)
    expect(result.width).toBe(175)
    expect(result.height).toBe(100)
  })

  it('should handle empty marks array', () => {
    const result = calcBound([])

    expect(result.left).toBe(0)
    expect(result.top).toBe(0)
    expect(result.right).toBe(0)
    expect(result.bottom).toBe(0)
    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })

  it('should calculate bounds recursively for nested marks', () => {
    const marks = [
      {
        type: 'group',
        attrs: {},
        children: [
          {
            type: 'rect',
            attrs: { x: 0, y: 0, width: 100, height: 50 },
          },
        ],
      },
    ]

    const result = calcBound(marks, { recursive: true })

    expect(result.left).toBe(0)
    expect(result.top).toBe(0)
    expect(result.right).toBe(100)
    expect(result.bottom).toBe(50)
  })
})
