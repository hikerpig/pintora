import pintora, { configApi, PintoraConfig } from '@pintora/core'
import THEMES from '../util/themes/index'

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
      themeVariables: THEMES.default,
    },
  })
}
