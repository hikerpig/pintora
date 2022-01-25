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
})
