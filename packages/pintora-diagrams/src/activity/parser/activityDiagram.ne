@{%
import * as moo from 'moo'
import { tv, textToCaseInsensitiveRegex, VALID_TEXT_REGEXP, COLOR_REGEXP } from '../../util/parser-shared'

let lexer = moo.compile({
  NEWLINE: { match: /\n/, lineBreaks: true },
  SPACE: { match: / /, lineBreaks: false },
  QUOTED_WORD: /\"[^"]*\"/,
  STYLE: /@style/, // for style.ne
  SEMICOLON: /;/,
  COLON: /:/,
  L_PAREN: { match: /\(/ },
  R_PAREN: { match: /\)/ },
  L_BRACKET: { match: /\{/ },
  R_BRACKET: { match: /\}/ },
  color: COLOR_REGEXP,
  START_NOTE: textToCaseInsensitiveRegex('@note'),
  END_NOTE: textToCaseInsensitiveRegex('@end_note'),
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
})

let yy

export function setYY(v) {
  yy = v
}

export function reset() {
  if (lexer.queuedText) {
    lexer.queuedText = ''; // this is a tweak for moo.js bug
  }
}
%}

@preprocessor typescript
@lexer lexer
@builtin "string.ne"
@builtin "whitespace.ne"
@include "../../util/parser-grammars/style.ne"

start -> __ start {% (d) => d[1] %}
	| "activityDiagram" document __:? {%
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
	  %SPACE:* statement {% (d) => {
      // console.log('[line]', JSON.stringify(d[1], null, 2))
      return d[1]
    } %}
	| %NEWLINE

statement ->
    action
  | ("start"|"stop"|"end") %NEWLINE {%
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
  | whileSentence
  | switchSentence
  | noteStatement
  | arrowLabelStatement

conditionSentence ->
    "if" %SPACE:+ wordsInParens %SPACE:+ "then" wordsInParens:? %SPACE:* %NEWLINE line:* elseClause:? _ "endif" _ %NEWLINE {%
      function(d) {
        // console.log('[conditions]', d[2])
        const thenLabel = d[5] || ''
        const elseResult = d[9]
        return {
          type: 'condition',
          message: d[2],
          then: { label: thenLabel, children: d[8].map(o => o[0]) },
          else: elseResult,
        }
      }
    %}

elseClause ->
    %SPACE:* "else" __ wordsInParens:? %SPACE:* %NEWLINE line:* {%
      function(d) {
        return { label: d[3], children: d[6].map(o => o[0]) }
      }
    %}

whileSentence ->
    "while" __ wordsInParens (%SPACE:+ "is" __ wordsInParens):? _ %NEWLINE line:* %SPACE:* "endwhile" (%SPACE:+ wordsInParens):? %NEWLINE {%
      function(d) {
        // console.log('[whileSentence]', d[11])
        const confirmLabel = d[3] ? d[3][3]: undefined
        const denyLabel = d[9] ? d[9][1]: undefined
        return {
          type: 'while',
          message: d[2],
          confirmLabel,
          denyLabel,
          children: d[6].map(o => o[0]),
        }
      }
    %}

switchSentence ->
    "switch" __ wordsInParens %SPACE:* %NEWLINE (%SPACE:* caseClause):* %SPACE:* "endswitch" %SPACE:* %NEWLINE {%
      function(d) {
        const message = d[2]
        const children = d[5].map(o => o[1])
        // console.log('switch', message)
        return { type: 'switch', message, children }
      }
    %}

caseClause ->
    "case" __ wordsInParens %SPACE:* %NEWLINE line:* {%
      function(d) {
        const confirmLabel = d[2].trim()
        const children = d[5].map(o => o[0])
        return { type: 'case', confirmLabel, children }
      }
    %}

wordsInParens ->
    %L_PAREN words %R_PAREN {% (d) => d[1] %}

words ->
    (%VALID_TEXT | %SPACE):+ {%
      function(d) {
        return d[0].map(o => tv(o[0])).join('')
      }
    %}

action ->
    %COLON multilineText %SEMICOLON _ %NEWLINE {%
      function(d) {
        return { type: 'addAction', action: { actionType: 'normal', message: d[1] } }
      }
    %}

multilineText ->
    (%VALID_TEXT|%SPACE|%NEWLINE):* {%
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
    groupType __ (color __):? words __ %L_BRACKET (__ statement):+ %SPACE:* %R_BRACKET %SPACE:* %NEWLINE {%
        function(d) {
          const groupType = tv(d[0][0])
          const background = d[2] ? (d[2][0]): null
          const label = (d[3] || groupType).trim()
          const name = (d[3] || `${groupType}_${Date.now()}`).trim()
          const children = d[6].map(l => l[1][0]).filter(o => o)
          children.forEach(child => child.parent = name)
          return { type: 'group', name, groupType, label, background, children, }
        }
      %}

placement ->
	  "left"  {% (d) => "left" %}
	| "right" {% (d) => "right" %}

multilineNoteText ->
    (%VALID_TEXT|%SPACE|%NEWLINE):* %END_NOTE {%
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
	  ("note"|%START_NOTE) %SPACE:* placement %COLON words %NEWLINE {%
      function(d) {
        const text = d[4].trim()
        // console.log('[note one]\n', text)
        return { type: 'note', placement: d[2], text }
      }
    %}
	| ("note"|%START_NOTE) %SPACE:* placement %SPACE:* %NEWLINE multilineNoteText %NEWLINE {%
      function(d) {
        // console.log('[note multi]\n', d[5])
        const text = d[5]
        return { type: 'note', placement: d[2], text }
      }
    %}

arrowLabelStatement ->
    "->" __ words %SEMICOLON _ %NEWLINE {%
      function(d) {
        return { type: 'arrowLabel', text: d[2] }
      }
    %}
