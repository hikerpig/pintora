import { Preproccessor } from '../'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('Preproccessor', () => {
  it('can parse @param', () => {
    const preproccessor = new Preproccessor()
    const example = stripStartEmptyLines(`
@param k1 v1
@param k2 v2
    `)
    preproccessor.parse(example)
    const result = preproccessor.getBaseDiagramIR()
    expect(result.configParams.length).toBe(2)
    expect(result.configParams).toEqual([
      { type: 'addParam', key: 'k1', value: 'v1' },
      { type: 'addParam', key: 'k2', value: 'v2' },
    ])
  })

  it('can parse title', () => {
    const preproccessor = new Preproccessor()
    const example = stripStartEmptyLines(`
    @title Example
    `)
    preproccessor.parse(example)
    const result = preproccessor.getBaseDiagramIR()
    expect(result.title).toBe('Example')
  })

  it('can parse override configs', () => {
    const preproccessor = new Preproccessor()
    const example = stripStartEmptyLines(`
  @config({
    "edgesep": 4
  })
    `)
    preproccessor.parse(example)
    const result = preproccessor.getBaseDiagramIR()
    expect(result.overrideConfig).toMatchObject({
      edgesep: 4,
    })
  })

  it('can parse @style block', () => {
    const example = stripStartEmptyLines(`
@style {
  #entity-CUSTOMER {
    textColor: green;
    borderColor: yellow;
  }
  .er__entity {
    fontStyle: italic;
  }
}
    `)
    const preproccessor = new Preproccessor()
    preproccessor.parse(example)
    const result = preproccessor.getBaseDiagramIR()
    expect(result.styleRules).toMatchSnapshot()
  })
})
