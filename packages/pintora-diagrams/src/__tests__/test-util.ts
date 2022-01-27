import pintora, { configApi, PintoraConfig, themeRegistry } from '@pintora/core'

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
