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
  getQuotedWord,
} from '../../util/parser-shared'
import type { ApplyPart } from '../db'

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
    NOTE: textToCaseInsensitiveRegex('@note'),
    START_NOTE: {
      match: /@start_note\s/,
      push: 'noteState',
    },
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    ...configLexerMainState,
    VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
  },
  configStatement: {
    ...configLexerconfigStatementState,
    ...COMMON_TOKEN_RULES,
  },
  noteState: {
    END_NOTE: {
      match: textToCaseInsensitiveRegex('@end_note'),
      pop: 1,
    },
    NL: MOO_NEWLINE,
    COMMA: /,/,
    WORD: { match: VALID_TEXT_REGEXP, fallback: true },
  }
})

let yy

export function setYY(v) {
  yy = v
}

function extractChildren(o) {
  return Array.isArray(o) ? o[0]: o
}
%}

start -> __ start {% (d) => d[1] %}
	| %ACTIVITY_DIAGRAM document {%
      function(d) {
        return d[1]
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
	| %WS:? %NL {% null %}

statement ->
    action
  | ("start"|"stop"|"end"|"detach"|"kill") %NL {%
      function(d) {
        const keyword = tv(d[0][0])
        return {
          type: 'keyword',
          label: keyword,
        }
      }
    %}
  | group
  | conditionSentence
  | repeatSentence
  | whileSentence
  | switchSentence
  | forkSentence
  | noteStatement
  | arrowLabelStatement
  | titleStatement
  | paramStatement _ %NL
  | configStatement _ %NL
  | comment _ %NL {% null %}

conditionSentence ->
    "if" wordsInParens "then" (_ wordsInParens):? %NL line:* elseClause:? _ "endif" _ %NL {%
      function(d) {
        // console.log('[conditions]', d[2])
        const thenLabel = (d[3] ? d[3][1]: null) || ''
        const elseResult = d[6]
        return {
          type: 'condition',
          message: d[1],
          then: { label: thenLabel, children: d[5].map(o => Array.isArray(o) ? o[0]: o) },
          else: elseResult,
        }
      }
    %}

elseClause ->
    %WS:* "else" wordsInParens:? %NL line:* {%
      function(d) {
        return { label: d[2], children: d[4].map(o => Array.isArray(o) ? o[0]: o) }
      }
    %}

whileSentence ->
    "while" wordsInParens (%WS "is" %WS wordsInParens):? _ %NL line:* %WS:* "endwhile" (_ wordsInParens):? %WS:? %NL {%
      function(d) {
        // console.log('[whileSentence]', d[6])
        const confirmLabel = d[2] ? d[2][3]: undefined
        const denyLabel = d[8] ? d[8][1]: undefined
        return {
          type: 'while',
          message: d[1],
          confirmLabel,
          denyLabel,
          children: d[5].map(o => Array.isArray(o) ? o[0]: o),
        }
      }
    %}

repeatSentence ->
    "repeat" %WS oneLineAction repeatBodyAndEnd {%
      function(d) {
        const firstAction = d[2].action
        const bodyAndEnd = d[3]
        return {
          type: 'repeat',
          firstAction,
          ...bodyAndEnd,
        } as ApplyPart
      }
    %}
  | "repeat" %WS:? %NL repeatBodyAndEnd {%
      function(d) {
        const bodyAndEnd = d[3]
        return {
          type: 'repeat',
          ...bodyAndEnd,
        } as ApplyPart
      }
    %}

repeatBodyAndEnd ->
    line:* %WS:* "repeatwhile" wordsInParens (%WS "is" %WS wordsInParens):? (%WS "not" %WS wordsInParens):? %WS:? %NL {%
      function(d) {
        const message = d[3]
        const confirmLabel = d[4] ? d[4][3]: undefined
        const denyLabel = d[5] ? d[5][3]: undefined
        return {
          message,
          confirmLabel,
          denyLabel,
          children: d[0].map(o => Array.isArray(o) ? o[0]: o),
        }
      }
    %}

switchSentence ->
    "switch" wordsInParens %WS:* %NL (%WS:* caseClause):* %WS:* "endswitch" %WS:* %NL {%
      function(d) {
        const message = d[1]
        const children = d[4].map(o => o[1])
        // console.log('switch', message)
        return { type: 'switch', message, children }
      }
    %}

caseClause ->
    "case" wordsInParens %WS:* %NL line:* {%
      function(d) {
        const confirmLabel = d[1].trim()
        const children = d[4].map(o => Array.isArray(o) ? o[0]: o)
        return { type: 'case', confirmLabel, children }
      }
    %}

forkSentence ->
    "fork" %WS:* %NL (%WS statement):+ (_ forkAgainClause):* _ ("endfork"|"endmerge") %NL {%
      function(d) {
        const firstActions = d[3].map(a => extractChildren(a[1]))
        const forkAgains = d[4].map(a => a[1])
        const branches = [{ type: 'forkBranch', children: firstActions }, ...forkAgains]
        const endWord = tv(d[6][0])
        const shouldMerge = endWord  === 'endmerge'
        return { type: 'fork', shouldMerge, branches }
      }
    %}

forkAgainClause ->
    "forkagain" %WS:* %NL (%WS statement):+ {%
      function(d) {
        const statements = d[3].map(a => extractChildren(a[1]))
        return { type: 'forkBranch', children: statements }
      }
    %}

wordsInParens ->
    %L_PAREN words %R_PAREN {% (d) => d[1] %}

words ->
    (%VALID_TEXT | %WS):+ {%
      function(d) {
        return d[0].map(o => tv(o[0])).join('')
      }
    %}

action ->
    %COLON multilineText %SEMICOLON %NL {%
      function(d) {
        return { type: 'addAction', action: { actionType: 'normal', message: d[1] } }
      }
    %}

oneLineAction ->
    %COLON words %SEMICOLON %NL {%
      function(d) {
        return { type: 'addAction', action: { actionType: 'normal', message: d[1] } }
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

groupType ->
    "group"
  | "partition"

group ->
    groupType __ (color %WS):? (%QUOTED_WORD | %VALID_TEXT) _ %L_BRACKET (__ statement):+ %WS:* %R_BRACKET %WS:* %NL {%
      function(d) {
        const groupType = tv(d[0][0])
        const background = d[2] ? (d[2][0]): null
        const titleToken = d[3][0]
        const title = titleToken.type === 'QUOTED_WORD' ? getQuotedWord(titleToken).replace(/"(.*)"/, '$1') : tv(titleToken)
        const label = (title || groupType).trim()
        const name = (title || `${groupType}_${Date.now()}`).trim()
        const children = d[6].map(l => l[1][0]).filter(o => o)
        children.forEach(child => child.parent = name)
        return { type: 'group', name, groupType, label, background, children, } as ApplyPart
      }
    %}

placement ->
	  "left"  {% (d) => "left" %}
	| "right" {% (d) => "right" %}

multilineNoteText ->
    (%COMMA|%WORD|%NL):* %END_NOTE {%
      function(d) {
        const v = d[0].map(l => {
          return l.map(o => tv(o))
        }).join('')
        let text = v
        if (v[v.length - 1] === '\n') {
          text = v.slice(0, v.length - 1)
        }
        return text
      }
    %}

noteStatement ->
	  ("note" | %NOTE) %WS:* placement %WS:* %COLON words %NL {%
      function(d) {
        const text = d[5].trim()
        // console.log('[note one]\n', text)
        return { type: 'note', placement: d[2], text } as ApplyPart
      }
    %}
	| ("note" | %START_NOTE) %WS:* placement %WS:* %NL multilineNoteText %NL {%
      function(d) {
        // console.log('[note multi]\n', d[5])
        const text = d[5]
        return { type: 'note', placement: d[2], text } as ApplyPart
      }
    %}

arrowLabelStatement ->
    "->" __ words %SEMICOLON _ %NL {%
      function(d) {
        return { type: 'arrowLabel', text: d[2] } as ApplyPart
      }
    %}

titleStatement ->
	  "title" %COLON words %NL {% (d) => ({ type: 'setTitle', text: d[2].trim() }) %}
