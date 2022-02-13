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
  if (token && 'value' in token) return token.value
  return token
}

/** CJK friendly text pattern */
export const VALID_TEXT_REGEXP = /(?:[a-zA-Z0-9_]\p{Unified_Ideograph})+/

/** hex color */
export const COLOR_REGEXP = /#[a-zA-Z0-9]+/

export const MOO_NEWLINE = { match: /[\n\r]/, lineBreaks: true }

// export const PARAM_DIRECTIVE = /@param/

export const COMMENT_LINE_REGEXP = /%%.*/

export const L_PAREN_REGEXP = /\(/
export const R_PAREN_REGEXP = /\)/

export const QUOTED_WORD_REGEXP = /\"[^"]*\"/

export const CONFIG_DIRECTIVE = /@config/

export const configLexerMainState = {
  CONFIG_DIRECTIVE: {
    match: CONFIG_DIRECTIVE,
    push: 'configClause',
  },
}

export const configLexerConfigClauseState = {
  QUOTED_WORD: QUOTED_WORD_REGEXP,
  L_PAREN: L_PAREN_REGEXP,
  R_PAREN: { match: R_PAREN_REGEXP, pop: 1 },
}
