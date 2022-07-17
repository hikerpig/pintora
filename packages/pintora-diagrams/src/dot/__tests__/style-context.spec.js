import { StyleContext } from '../artist/style-context'

describe('StyleContext', () => {
  it('getValue through parent chain', () => {
    const p = new StyleContext()
    const c = new StyleContext()
    c.setParent(p)

    p.setValues({
      color: 'green',
      fontcolor: 'purple',
    })
    expect(c.getValue('color')).toEqual('green')

    c.set('color', 'red')
    expect(c.getValue('color')).toEqual('red')
    expect(c.getValue('fontcolor')).toEqual('purple')

    const c2 = c.spawn()
    expect(c2.getValue('fontcolor')).toEqual('purple')
  })

  it('resolve through parent chain', () => {
    const p = new StyleContext()
    const c = new StyleContext()
    c.setParent(p)

    p.setValues({
      color: 'green',
    })

    expect(c.resolve('not_exist')).toMatchObject({
      resolved: false,
    })
    expect(c.resolve('color')).toMatchObject({
      resolved: true,
      value: 'green',
    })
  })
})
