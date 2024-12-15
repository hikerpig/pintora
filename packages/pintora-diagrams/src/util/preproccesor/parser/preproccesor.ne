@preprocessor typescript
@lexer lexer
@skip_unmatch %WS
@include "whitespace.ne"
@include "config.ne"
@include "comment.ne"

@{%
import * as moo from '@hikerpig/moo'
import {
  tv,
  textToCaseInsensitiveRegex,
  VALID_TEXT_REGEXP,
  COMMENT_LINE_REGEXP,
  QUOTED_WORD_REGEXP,
  configLexerMainState,
  configLexerconfigStatementState,
  L_PAREN_REGEXP,
  R_PAREN_REGEXP,
  COLOR_REGEXP,
  MOO_NEWLINE,
} from '../../parser-shared'

const COMMON_TOKEN_RULES = {
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
}

let lexer = moo.states({
  main: {
    NL: MOO_NEWLINE,
    WS: { match: / +/, lineBreaks: false },
    QUOTED_WORD: QUOTED_WORD_REGEXP,
    COLOR: COLOR_REGEXP,
    SEMICOLON: /;/,
    COLON: /:/,
    ACTIVITY_DIAGRAM: /activityDiagram/,
    L_PAREN: L_PAREN_REGEXP,
    R_PAREN: R_PAREN_REGEXP,
    L_BRACKET: { match: /\{/ },
    R_BRACKET: { match: /\}/ },
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    ...configLexerMainState,
    VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
  },
  configStatement: {
    ...configLexerconfigStatementState,
    ...COMMON_TOKEN_RULES,
  },
})

function extractChildren(o) {
  return Array.isArray(o) ? o[0]: o
}
%}

start -> __ start {% (d) => d[1] %}
	| document {%
      function(d) {
        return d[0]
      }
    %}

document -> null
  | document line {%
    (d) => {
        // console.log('[doc line]', d[1])
        const r = d[0].concat(d[1])
        return r
      }
    %}

line ->
	  %WS:* statement {% (d) => {
      // console.log('[line]', JSON.stringify(d[1], null, 2))
      return d[1]
    } %}
	| %WS:* %NL {% null %}

statement ->
    titleStatement
  | paramStatement _ %NL
  | configStatement _ %NL
  | comment _ %NL {% null %}

words ->
    (%VALID_TEXT | %WS):+ {%
      function(d) {
        return d[0].map(o => tv(o[0])).join('')
      }
    %}

titleStatement ->
	  "@title" words %NL {% (d) => ({ type: 'setTitle', text: d[1].trim() }) %}
