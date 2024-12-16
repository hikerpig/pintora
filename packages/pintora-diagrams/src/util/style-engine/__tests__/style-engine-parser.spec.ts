import { StyleParse } from '../parser-test'
import { stripStartEmptyLines } from '@pintora/test-shared'

describe('style engine parser', () => {
  it('can parse @style block', () => {
    const example = stripStartEmptyLines(`
@style {
  #Alice {
    fontFamily: serif;
  }
  .message__text {
    textColor: #ff0000;
  }
}
    `)
    const result = StyleParse.parse(example)
    expect(result).toMatchSnapshot()
  })
})
