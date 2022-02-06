import configApi from '../config'

describe('pintora core configApi', () => {
  it('replace array instead of merging', () => {
    configApi.setConfig({
      a: [1, 2],
    })
    configApi.setConfig({
      a: [3, 4],
    })
    expect(configApi.getConfig()).toMatchObject({ a: [3, 4] })
  })

  describe('gnernateNewConfig(c)', () => {
    it('will get themeVariables from themeRegistry if themeConfig.theme is provided', () => {
      const newConfig = configApi.gnernateNewConfig({
        themeConfig: {
          theme: 'dark',
        },
      })

      const currentConfig = configApi.getConfig()
      expect(newConfig).not.toBe(currentConfig)

      expect(newConfig.themeConfig.themeVariables.primaryColor).not.toEqual(
        currentConfig.themeConfig.themeVariables.primaryColor,
      )
    })

    it('will assign extra themeConfig.themeVariables', () => {
      const newConfig = configApi.gnernateNewConfig({
        themeConfig: {
          theme: 'dark',
          themeVariables: {
            primaryColor: '#ffffff',
          },
        },
      })
      expect(newConfig.themeConfig.themeVariables.primaryColor).toBe('#ffffff')
    })
  })
})
