@preprocessor typescript
@lexer lexer
@include "whitespace.ne"
@include "config.ne"
@include "comment.ne"
@include "bind.ne"

@{%
import * as moo from '@hikerpig/moo'
import {
  tv,
  MOO_NEWLINE,
  VALID_TEXT_REGEXP,
  COMMENT_LINE_REGEXP,
  L_PAREN_REGEXP,
  R_PAREN_REGEXP,
  configLexerMainState,
  configLexerconfigStatementState,
  BIND_REGEXPS,
} from '../../util/parser-shared'

import type { ApplyPart } from '../db'

const COMMON_TOKEN_RULES = {
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
}

let lexer = moo.states({
  main: {
    NL: MOO_NEWLINE,
    WS: { match: / +/, lineBreaks: false },
    SEMICOLON: /;/,
    COLON: /:/,
    PARAM_DIRECTIVE,
    ...configLexerMainState,
    L_PAREN: L_PAREN_REGEXP,
    R_PAREN: R_PAREN_REGEXP,
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    ...BIND_REGEXPS,
    ...COMMON_TOKEN_RULES,
  },
  configStatement: {
    ...configLexerconfigStatementState,
    ...COMMON_TOKEN_RULES,
  },
})

const parseNotation = (text) => {
  let char = text[0]
  const isReverse = char === '-'
  if (char === '+' || char === '*' || char === '-') {
    let i = 1
    let depth = 1
    while (i < text.length && text[i] === char) {
      i += 1
      depth += 1
    }
    if (i < text.length && text[i] !== ' ') {
      throw new Error(`Unrecognized notation: ${text}`)
    }
    return { depth, text: text.slice(0, depth), isReverse }
  }
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
    %VALID_TEXT %WS words %NL {%
      function(d) {
        const label = d[2]
        const notation = parseNotation(tv(d[0]))

        return { type: 'addItem', label, depth: notation.depth, isReverse: notation.isReverse } as ApplyPart
      }
    %}
  | %VALID_TEXT %WS %COLON multilineText %SEMICOLON %WS:? %NL {%
      function(d) {
        const label = d[3]
        const notation = parseNotation(tv(d[0]))
        return { type: 'addItem', label, depth: notation.depth, isReverse: notation.isReverse } as ApplyPart
      }
    %}
  | paramStatement _ %NL
  | configOpenCloseStatement _ %NL
  | "title" %COLON words %NL {% (d) => ({ type:'setTitle', text: d[2].trim() }) %}
  | bindClassStatement
  | comment _ %NL

textSegment -> %VALID_TEXT | %WS {%
      function(d) {
        const c = d[0]
        return typeof c === 'string' ? c : tv(c)
      }
    %}

words ->
    textSegment:+ {%
      function(d) {
        const v = d[0].map(o => o[0]).join('')
        return v
      }
    %}

multilineText ->
    (textSegment|%NL):* {%
      function(d) {
        // console.log('[multiline text]', d)
        const v = d[0].map(l => {
          return l.map(o => typeof o === 'string' ? o: tv(o))
        }).join('')
        return v
      }
    %}
