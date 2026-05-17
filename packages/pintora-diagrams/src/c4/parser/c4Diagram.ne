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
  COMMENT_LINE_REGEXP,
  configLexerMainState,
  configLexerconfigStatementState,
  MOO_NEWLINE,
  getQuotedWord,
} from '../../util/parser-shared'

const C4_QUOTED_WORD_REGEXP = /"(?:\\["nr]|[^"])*"/

const commonTopRules = {
  NL: MOO_NEWLINE,
  WS: { match: /[ \t]+/, lineBreaks: true },
  COMMENT_LINE: COMMENT_LINE_REGEXP,
}

let lexer = moo.states({
  main: {
    ...commonTopRules,
    PARAM_DIRECTIVE: /@param/,
    COMMA: /,/,
    COLON: /:/,
    EQUALS: /=/,
    HYPHEN: /-/,
    SLASH: /\//,
    L_PAREN: /\(/,
    R_PAREN: /\)/,
    L_BRACE: /\{/,
    R_BRACE: /\}/,
    DOLLAR_IDENTIFIER: /\$[A-Za-z_][A-Za-z0-9_]*/,
    NUMBER: /[0-9]+(?:\.[0-9]+)?/,
    IDENTIFIER: /[A-Za-z_][A-Za-z0-9_]*/,
    COLOR: /#[a-zA-Z0-9]+/,
    QUOTED_WORD: C4_QUOTED_WORD_REGEXP,
    ...configLexerMainState,
  },
  configStatement: {
    ...configLexerconfigStatementState,
    CONFIG_TEXT: { match: /[^()]+/, lineBreaks: true },
  },
})

let yy

export function setYY(v) {
  yy = v
}

function tokenValue(v) {
  return tv(v)
}

function macroArgValue(v) {
  if (v && v.type === 'QUOTED_WORD') return getQuotedWord(v)
  return tokenValue(v)
}
%}

start -> _ entry document {%
  function(d) {
    return { entry: tokenValue(d[1]), actions: d[2] }
  }
%}

entry ->
    %IDENTIFIER {% id %}

document ->
    null {% () => [] %}
  | document line {%
      function(d) {
        if (!d[1]) return d[0]
        if (Array.isArray(d[1])) return d[0].concat(d[1])
        return d[0].concat([d[1]])
      }
    %}

line ->
    _ statement _ {% (d) => d[1] %}
  | _ %NL {% () => null %}

statement ->
    titleStatement {% id %}
  | configOpenCloseStatement {% id %}
  | paramStatement {% id %}
  | comment {% id %}
  | legendStatement {% id %}
  | boundaryMacro {% id %}
  | macroCall {% id %}

titleStatement ->
    "title" _ %COLON _ titleText %NL {%
      function(d) {
        return { type: 'setTitle', text: d[4].trim() }
      }
    %}

titleText ->
    titleToken:+ {% (d) => d[0].map(tokenValue).join('') %}

titleToken ->
    %IDENTIFIER {% id %}
  | %DOLLAR_IDENTIFIER {% id %}
  | %QUOTED_WORD {% id %}
  | %NUMBER {% id %}
  | %COMMA {% id %}
  | %COLON {% id %}
  | %EQUALS {% id %}
  | %HYPHEN {% id %}
  | %SLASH {% id %}
  | %L_PAREN {% id %}
  | %R_PAREN {% id %}
  | %WS {% id %}

legendStatement ->
    "Legend" __ {%
      function() {
        return { type: 'macro', name: 'Legend', args: [] }
      }
    %}

boundaryMacro ->
    macroHead _ %L_BRACE document _ %R_BRACE __ {%
      function(d) {
        return { type: 'boundaryMacro', name: d[0].name, args: d[0].args, children: d[3] }
      }
    %}

macroCall ->
    macroHead %NL {%
      function(d) {
        return { type: 'macro', name: d[0].name, args: d[0].args }
      }
    %}

macroHead ->
    %IDENTIFIER _ %L_PAREN _ argList:? _ %R_PAREN {%
      function(d) {
        return { name: tokenValue(d[0]), args: d[4] || [] }
      }
    %}

argList ->
    macroArg (_ %COMMA _ macroArg):* {%
      function(d) {
        return [d[0]].concat(d[1].map(item => item[3]))
      }
    %}

macroArg ->
    namedArg {% id %}
  | positionalArg {% id %}

namedArg ->
    %DOLLAR_IDENTIFIER _ %EQUALS _ positionalValue {%
      function(d) {
        return { type: 'named', name: tokenValue(d[0]), value: d[4] }
      }
    %}

positionalArg ->
    positionalValue {%
      function(d) {
        return { type: 'positional', value: d[0] }
      }
    %}

positionalValue ->
    %QUOTED_WORD {% (d) => macroArgValue(d[0]) %}
  | styleFunctionValue {% id %}
  | %IDENTIFIER {% (d) => macroArgValue(d[0]) %}
  | %DOLLAR_IDENTIFIER {% (d) => macroArgValue(d[0]) %}
  | %NUMBER {% (d) => macroArgValue(d[0]) %}
  | %COLOR {% (d) => macroArgValue(d[0]) %}

styleFunctionValue ->
    %IDENTIFIER _ %L_PAREN _ %R_PAREN {%
      function(d) {
        return tokenValue(d[0]) + '()'
      }
    %}
