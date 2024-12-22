const LETTER_REGEXP = /[a-zA-Z]/
const isCharLetter = char => LETTER_REGEXP.test(char)

// from moo issue: https://github.com/no-context/moo/issues/117
export function textToCaseInsensitiveRegex(text) {
  const regexSource = text.split('').map(char => {
    if (isCharLetter(char)) {
      return `[${char.toLowerCase()}${char.toUpperCase()}]`
    }

    return char
  })

  return new RegExp(regexSource.join(''))
}

/** token value */
export function tv(token) {
  // if (typeof token === 'string') return token
  if (token && 'value' in token) return token.value
  return token
}

/** CJK friendly text pattern */
export const VALID_TEXT_REGEXP = /(?:[a-zA-Z0-9_]\p{Unified_Ideograph})+/

/** hex color */
export const COLOR_REGEXP = /#[a-zA-Z0-9]+/

export const MOO_NEWLINE = { match: /\n|\r\n/, lineBreaks: true }

export const COMMENT_LINE_REGEXP = /%%.*/

export const L_PAREN_REGEXP = /\(/
export const R_PAREN_REGEXP = /\)/

/**
 * quoted string that has escaped chars inside
 */
export const QUOTED_WORD_REGEXP = /"(?:\\["nr]|[^"])+"/

// export const PARAM_DIRECTIVE = /@param/

export const CONFIG_DIRECTIVE = /@config/

export const configLexerMainState = {
  CONFIG_DIRECTIVE: {
    match: CONFIG_DIRECTIVE,
    push: 'configStatement',
  },
}

export const configLexerconfigStatementState = {
  QUOTED_WORD: QUOTED_WORD_REGEXP,
  L_PAREN: L_PAREN_REGEXP,
  R_PAREN: { match: R_PAREN_REGEXP, pop: 1 },
}

export function getQuotedWord(token) {
  const v = tv(token)
  return v.slice(1, v.length - 1).replace(/\\"/g, '"')
}

export function makeNth(n: number) {
  return function (d: unknown[]) {
    return d[n]
  }
}

export function flatten(list) {
  const output = []

  function walk(item) {
    if (Array.isArray(item)) {
      item.forEach(walk)
    } else {
      output.push(item)
    }
    return output
  }

  return walk(list)
}

export const BIND_REGEXPS = {
  BIND_CLASS: /@bindClass/,
}
