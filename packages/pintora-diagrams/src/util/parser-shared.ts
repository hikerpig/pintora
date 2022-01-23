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

export const MOO_NEWLINE = { match: /\n/, lineBreaks: true }

// export const CONFIG_DIRECTIVE = /@config/
