@preprocessor typescript
@lexer lexer
@skip_unmatch %WS
@builtin "postprocessors.ne"
@include "../../util/parser-grammars/whitespace.ne"
@include "../../util/parser-grammars/config.ne"
@include "../../util/parser-grammars/comment.ne"

@{%
import * as moo from '@hikerpig/moo'
import {
  tv,
  textToCaseInsensitiveRegex,
  VALID_TEXT_REGEXP,
  COMMENT_LINE_REGEXP,
  CONFIG_DIRECTIVE,
  QUOTED_WORD_REGEXP,
  MOO_NEWLINE,
} from '../../util/parser-shared'
import { Action } from '../db'

const ATTR_KEYWORDS = ['title', 'dateFormat', 'axisFormat']
const OTHER_KEYWORDS = ['section', 'markDate', 'excludes', 'includes']

const keywordRules = [...ATTR_KEYWORDS, ...OTHER_KEYWORDS].reduce((acc, text) => {
  const pattern = new RegExp(`${text}`)
  acc[text.toUpperCase()] = {
    match: pattern,
    push: 'attr'
  }
  return acc
}, {})

const commonTextRules = {
  QUOTED_WORD: QUOTED_WORD_REGEXP,
}

let lexer = moo.states({
  main: {
    NL: MOO_NEWLINE,
    WS: { match: / +/, lineBreaks: false },
    ...commonTextRules,
    ...keywordRules,
    COLON: /:/,
    LEFT_BRACE: /\{/,
    RIGHT_BRACE: /\}/,
    PARAM_DIRECTIVE: /@param/, // for config.ne
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    CONFIG_DIRECTIVE,
    VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
  },
  attr: {
    ...commonTextRules,
    VALID_TEXT: { match: /[^\n]+/, pop: 1 },
  }
})
%}


start -> __ start
  | "gantt" document

document -> null
  | document line {% (d) => {
      let r = d[0]
      if (d[1]) {
        r = d[0].concat(d[1])
      }
      return r
    } %}

line ->
    %WS:? statement {% nth(1) %}
	| %WS:? %NL {% null %}

statement ->
    attrKey %WS:? words %NL {% (d) =>
      {
        const value = d[2].trim()
        return { type: 'addAttr', key: d[0], value } as Action
      }
    %}
  | %SECTION words %NL {% (d) =>
      {
        return { type: 'addSection', label: d[1].trim() } as Action
      }
    %}
  | %MARKDATE words %NL {% (d) =>
      {
        return { type: 'markDate', value: d[1].trim() } as Action
      }
    %}
  | words %COLON words %NL {% (d) =>
      {
        return { type: 'addTask', label: d[0], extraValue: d[2] } as Action
      }
    %}
  | paramClause %NL {% nth(0) %}
  | configOpenCloseClause %NL {% nth(0) %}
  | comment %NL {% null %}

attrKey ->
    (%TITLE | %DATEFORMAT | %AXISFORMAT | %EXCLUDES | %INCLUDES) {% (d) => {
      return tv(d[0][0])
    } %}

words ->
    %VALID_TEXT (%VALID_TEXT | %WS):* {%
      function(d) {
        return tv(d[0]) + d[1].map(o => tv(o[0])).join('')
      }
    %}
  | %QUOTED_WORD {%
      function(d) {
        const vWithQuotes = tv(d[0])
        return vWithQuotes.slice(1, vWithQuotes.length - 1)
      }
    %}
