import {
  configApi,
  PintoraConfig,
  themeRegistry,
  GraphicsIR,
  Mark,
  DiagramArtistOptions,
  DiagramEventType,
  IGraphicEvent,
  parseAndDraw,
} from '@pintora/core'

export function testDraw(code: string, extraOptions: Partial<DiagramArtistOptions> = {}) {
  let success = true
  const result = parseAndDraw(code, {
    ...extraOptions,
    onError(err) {
      console.error(err)
      success = false
    },
  })
  if (!success) {
    throw Error('testDraw fail')
  }
  return result!
}

export function prepareDiagramConfig() {
  configApi.setConfig<PintoraConfig>({
    themeConfig: {
      theme: 'default',
      darkTheme: 'dark',
      themeVariables: themeRegistry.themes.default,
    },
  })
}

const GEOMETRY_ATTRS = [
  'x',
  'y',
  'cx',
  'cy',
  'rx',
  'ry',
  'r',
  'width',
  'height',
  'x1',
  'x2',
  'y1',
  'y2',
  'path',
  'points',
  'margin',
]
const MARK_IGNORE_FIELDS = ['matrix', 'symbolBounds']

/**
 * width/height and other text dimension related attributes may differ from test machine's default font.
 * ignore them for now to pass CI tests.
 */
export function stripGraphicIRForSnapshot(ir: GraphicsIR) {
  const cloned = ir
  delete cloned.height
  delete cloned.width

  const visited: Map<Mark, boolean> = new Map()

  function processMark(mark: Mark) {
    if (!mark) return
    if (visited.has(mark)) return

    visited.set(mark, true)
    const attrs = mark.attrs
    if (attrs) {
      GEOMETRY_ATTRS.forEach(k => {
        if (k in attrs) delete attrs[k]
      })
    }

    MARK_IGNORE_FIELDS.forEach(k => {
      if (k in mark) delete mark[k]
    })

    if ('children' in mark) {
      mark.children.forEach(child => processMark(child))
    }
    // symbol
    if ('mark' in mark) {
      mark.mark.children?.forEach(child => processMark(child))
    }
  }

  processMark(cloned.mark)

  return cloned
}

export function stripDrawResultForSnapshot(result: ReturnType<typeof parseAndDraw>) {
  return stripGraphicIRForSnapshot(result.graphicIR)
}

type VisitorActions = {
  stop(): void
}

export function traverseGraphicsIR(ir: GraphicsIR, visitor: (mark: Mark, actions: VisitorActions) => void) {
  const visited: Map<Mark, boolean> = new Map()

  let stopped = false
  const actions: VisitorActions = {
    stop() {
      stopped = true
    },
  }

  function _visit(mark: Mark) {
    if (!mark) return
    if (visited.has(mark)) return

    visited.set(mark, true)

    visitor(mark, actions)
    if (stopped) return

    if ('children' in mark) {
      mark.children.forEach(child => _visit(child))
    }
  }

  _visit(ir.mark)
}

export function findMarkInGraphicsIR(ir: GraphicsIR, predicate: (mark: Mark) => boolean) {
  let result = null
  traverseGraphicsIR(ir, (mark, acitons) => {
    if (predicate(mark)) {
      result = mark
      acitons.stop()
    }
  })
  return result
}

/**
 * simulate a graphic event
 */
export function makeGraphicEvent(type: DiagramEventType, mark: Mark) {
  const graphicEvent: IGraphicEvent = {
    type,
    x: 10,
    y: 10,
    clientX: 20,
    clientY: 20,
    mark,
    markPath: [mark],
  }
  return graphicEvent
}

export function replaceEofToCrlf(str: string) {
  return str.replace(/\n/g, '\r\n')
}
