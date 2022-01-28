import pintora, { configApi, PintoraConfig, themeRegistry, GraphicsIR, Mark } from '@pintora/core'
import cloneDeep from 'clone-deep'

export function testDraw(code: string) {
  let success = true
  const result = pintora.parseAndDraw(code, {
    onError(err) {
      console.error(err)
      success = false
    },
  })
  if (!success) {
    throw Error('testDraw fail')
  }
  return result
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

const GEOMETRY_ATTRS = ['x', 'y', 'width', 'height']

/**
 * width/height and other text dimension related attributes may differ from test machine's default font.
 * ignore them for now to pass CI tests.
 */
export function stripGraphicIRForSnapshot(ir: GraphicsIR) {
  const cloned = cloneDeep(ir)
  delete cloned.height
  delete cloned.width

  function processMark(mark: Mark) {
    const attrs = mark.attrs
    if (attrs) {
      GEOMETRY_ATTRS.forEach(k => {
        if (k in attrs) delete attrs[k]
      })
    }

    if ('children' in mark) {
      mark.children.forEach(child => processMark(child))
    }
  }

  processMark(cloned.mark)

  return cloned
}

export function stripDrawResultForSnapshot(result: ReturnType<typeof pintora.parseAndDraw>) {
  return stripGraphicIRForSnapshot(result.graphicIR)
}
