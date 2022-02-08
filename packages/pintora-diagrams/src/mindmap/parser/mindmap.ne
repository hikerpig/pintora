@preprocessor typescript
@lexer lexer
@builtin "whitespace.ne"
@include "../../util/parser-grammars/config.ne"
@include "../../util/parser-grammars/comment.ne"

@{%
import * as moo from '@hikerpig/moo'
import {
  tv,
  MOO_NEWLINE,
  VALID_TEXT_REGEXP,
  COMMENT_LINE_REGEXP,
  CONFIG_DIRECTIVE,
  L_PAREN_REGEXP,
  R_PAREN_REGEXP,
  configLexerMainState,
  configLexerConfigClauseState,
} from '../../util/parser-shared'

import type { ApplyPart } from '../db'

const COMMON_TOKEN_RULES = {
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
}

let lexer = moo.states({
  main: {
    NL: MOO_NEWLINE,
    WS: { match: /[ ]+/, lineBreaks: false },
    ASTERISKS: /\*+/,
    PLUS: /\++/,
    MINUS: /\-+/,
    SEMICOLON: /;/,
    COLON: /:/,
    PARAM_DIRECTIVE,
    ...configLexerMainState,
    L_PAREN: L_PAREN_REGEXP,
    R_PAREN: R_PAREN_REGEXP,
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    ...COMMON_TOKEN_RULES,
  },
  configClause: {
    ...configLexerConfigClauseState,
    ...COMMON_TOKEN_RULES,
  },
})

let yy

export function setYY(v) {
  yy = v
}
%}

start -> __ start
  | "mindmap" document

document -> null
  | document line {%
    (d) => {
        // console.log('[doc line]', d[1])
        const r = d[0].concat(d[1])
        return r
      }
    %}

line ->
    %WS:* statement
	| %WS:* %NL

statement ->
    levelNotation %WS words %NL {%
      function(d) {
        const label = d[2]
        // console.log('singleline', label)
        const notation = d[0]
        return { type: 'addItem', label, depth: d[0].depth, isReverse: notation.isReverse } as ApplyPart
      }
    %}
  | levelNotation %WS %COLON multilineText %SEMICOLON %WS:? %NL {%
      function(d) {
        const label = d[3]
        const notation = d[0]
        return { type: 'addItem', label, depth: notation.depth, isReverse: notation.isReverse } as ApplyPart
      }
    %}
  | paramClause _ %NL
  | configOpenCloseClause %NL
  | comment _ %NL

levelNotation ->
    (%ASTERISKS | %PLUS) {%
      function(d) {
        const text = tv(d[0][0])
        return {
          depth: text.length,
          text,
        }
      }
    %}
  | %MINUS {%
      function(d) {
        const text = tv(d[0])
        return {
          depth: text.length,
          text,
          isReverse: true
        }
      }
    %}

words ->
    (%VALID_TEXT | %ASTERISKS | %PLUS | %MINUS | %WS):+ {%
      function(d) {
        const v = d[0].map(o => tv(o[0])).join('')
        return v
      }
    %}

multilineText ->
    (%VALID_TEXT|%WS|%NL):* {%
      function(d) {
        // console.log('[multiline text]', d)
        const v = d[0].map(l => {
          return l.map(o => tv(o))
        }).join('')
        return v
      }
    %}
