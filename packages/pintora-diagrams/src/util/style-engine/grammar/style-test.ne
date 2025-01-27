@preprocessor typescript
@lexer lexer
@skip_unmatch %WS
@include "whitespace.ne"
@include "config.ne"
@include "comment.ne"
@include "style.ne"
@include "bind.ne"

@{%
// shared-grammars/style.ne is used as a sub-grammar that need to be imported into actual grammars,
// this style-test.ne is used only for testing
import * as moo from '@hikerpig/moo'
import {
  tv,
  VALID_TEXT_REGEXP,
  COMMENT_LINE_REGEXP,
  QUOTED_WORD_REGEXP,
  L_PAREN_REGEXP,
  R_PAREN_REGEXP,
  MOO_NEWLINE,
  BIND_REGEXPS,
} from '../../parser-shared'

const COMMON_TOKEN_RULES = {
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
}

let lexer = moo.states({
  main: {
    NL: MOO_NEWLINE,
    WS: { match: / +/, lineBreaks: false },
    QUOTED_WORD: QUOTED_WORD_REGEXP,
    SEMICOLON: /;/,
    COLON: /:/,
    COMMA: /,/,
    ...BIND_REGEXPS,
    L_PAREN: L_PAREN_REGEXP,
    R_PAREN: R_PAREN_REGEXP,
    L_BRACKET: { match: /\{/ },
    R_BRACKET: { match: /\}/ },
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
  },
})

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
    styleStatement
  | bindClassStatement
  | comment _ %NL {% null %}
