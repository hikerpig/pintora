@{%
import * as moo from 'moo'
import { tv, textToCaseInsensitiveRegex, VALID_TEXT_REGEXP } from '../../util/parser-shared'

let lexer = moo.states({
  main: {
    NEWLINE: { match: /\n/, lineBreaks: true },
    SPACE: {match: /\s+/, lineBreaks: true},
    START_NOTE: textToCaseInsensitiveRegex('@note'),
    END_NOTE: textToCaseInsensitiveRegex('@end_note'),
    BACKQUOTED_TEXT: /`[^`]*`/,
    SOLID_ARROW: /->>/,
    DOTTED_ARROW: /-->>/,
    SOLID_OPEN_ARROW: /->/,
    DOTTED_OPEN_ARROW: /-->/,
    SOLID_CROSS: /\-x/,
    DOTTED_CROSS: /\-\-x/,
    SOLID_POINT: /\-[\)]/,
    DOTTED_POINT: /\-\-[\)]/,
    PLUS: /\+/,
    MINUS: /-/,
    COMMA: /,/,
    COLON: { match: /:/, push: 'line' },
    _PLACEMENT: [
      { match: /left\sof/, type: () => 'LEFT_OF' },
      { match: /right\sof/, type: () => 'RIGHT_OF' },
    ],
    WORD: { match: VALID_TEXT_REGEXP, fallback: true },
  },
  line: {
    REST_OF_LINE: { match: /[^#\n;]+/, pop: 1 },
  },
})

let yy

export function setYY(v) {
  yy = v
}
%}

@preprocessor typescript
@lexer lexer
@builtin "string.ne"
@builtin "whitespace.ne"

start -> __ start
	| "sequenceDiagram" document {%
      function(d) {
        yy.apply(d[1])
        return d[1]
      }
    %}

document -> null
  | document line {%
    (d) => {
        // console.log('[doc line]', d[1])
        return d[1]
      }
    %}

line ->
	  %SPACE:* statement {% (d) => {
      // console.log('[line]', JSON.stringify(d[1], null, 2))
      return d[1]
    } %}
	| %NEWLINE

statement ->
	  "participant" __ actor __ "as" __ %WORD _ %NEWLINE {%
      function(d) {
        d[2].description = yy.parseMessage(tv(d[6]))
        return d[2]
      }
    %}
	| "participant" __ actor %NEWLINE {%
      function(d) {
        return d[2]
      }
    %}
	| signal %NEWLINE {% id %}
	| "autonumber" %NEWLINE {% (d) => yy.enableSequenceNumbers() %}
	| "activate" _ actor %NEWLINE {%
      function(d) {
        return {
          type: 'activeStart', signalType: yy.LINETYPE.ACTIVE_START, actor: d[2]
        }
      }
    %}
	| "deactivate" _ actor %NEWLINE {%
      function(d) {
        return {
          type: 'activeEnd', signalType: yy.LINETYPE.ACTIVE_END, actor: d[2]
        }
      }
    %}
	| note_statement {% (d) => {
    // console.log('[note_a]', d)
    return d[0]
  } %}
	| "title" textWithColon %NEWLINE {% (d) => ({ type:'setTitle', text: d[1] }) %}
	| ("loop"|"opt") words %NEWLINE document _ "end" {%
      function(d) {
        const groupType = tv(d[0][0])
        const text = yy.parseMessage(d[1])
        const result = [
          {type: 'groupStart', text, groupType },
          d[3],
          {type: 'groupEnd', groupType },
        ]
        return result
      }
    %}
	| ("par") words %NEWLINE par_sections _ "end" {%
      function(d) {
        const groupType = tv(d[0][0])
        const text = yy.parseMessage(d[1])
        const result = [
          {type: 'groupStart', text, groupType },
          d[3],
          {type: 'groupEnd', groupType },
        ]
        return result
      }
    %}
	| ("alt") words %NEWLINE else_sections _ "end" {%
      function(d) {
        const groupType = tv(d[0][0])
        const text = yy.parseMessage(d[1])
        const result = [
          {type: 'groupStart', text, groupType },
          d[3],
          {type: 'groupEnd', groupType },
        ]
        return result
      }
    %}
  | "==" __ (%WORD | %SPACE):+ __ "==" {%
      function(d) {
        const text = d[2].map(o => tv(o[0])).join('').trim()
        return { type: 'addDivider', text, signalType: yy.LINETYPE.DIVIDER }
      }
    %}

words -> (%WORD | %SPACE):+ {%
      function(d) {
        return d[0].map(a => a[0]).map(o => tv(o)).join('')
      }
    %}

signaltype ->
	  %SOLID_OPEN_ARROW  {% (d) => yy.LINETYPE.SOLID_OPEN %}
	| %DOTTED_OPEN_ARROW {% (d) => yy.LINETYPE.DOTTED_OPEN %}
	| %SOLID_ARROW       {% (d) => yy.LINETYPE.SOLID %}
	| %DOTTED_ARROW      {% (d) => yy.LINETYPE.DOTTED %}
	| %SOLID_CROSS       {% (d) => yy.LINETYPE.SOLID_CROSS %}
	| %DOTTED_CROSS      {% (d) => yy.LINETYPE.DOTTED_CROSS %}
	| %SOLID_POINT       {% (d) => yy.LINETYPE.SOLID_POINT %}
	| %DOTTED_POINT      {% (d) => yy.LINETYPE.DOTTED_POINT %}

signal ->
	  actor signaltype %PLUS actor _ textWithColon {%
      function(d) {
        return [
          d[0], d[3],
          {type: 'addSignal', from: d[0].actor, to: d[3].actor, signalType: d[1], msg: d[5]},
          {type: 'activeStart', signalType: yy.LINETYPE.ACTIVE_START, actor: d[3]}
        ]
      }
    %}
	| actor signaltype %MINUS actor _ textWithColon {%
      function(d) {
        return [
          d[0], d[3],
          {type: 'addSignal', from: d[0].actor, to: d[3].actor, signalType: d[1], msg: d[5]},
          {type: 'activeEnd', signalType: yy.LINETYPE.ACTIVE_END, actor: d[3]}
        ]
      }
    %}
	| actor signaltype actor _ textWithColon {%
      function(d) {
        // console.log('got message', d)
        return [
          d[0], d[2],
          {type: 'addSignal', from: d[0].actor, to: d[2].actor, signalType: d[1], msg: d[4]},
        ]
      }
    %}

actor -> %WORD {% (d) => {
  return ({ type: 'addActor', actor: tv(d[0]) })
} %}

textWithColon -> %COLON _ %REST_OF_LINE {%
  function(d) {
    return yy.parseMessage(tv(d[2]).trim())
  }
%}

multilineNoteText ->
    (%WORD|%SPACE|%NEWLINE):* %END_NOTE {%
      function(d) {
        // console.log('[multiline text]', d)
        const v = d[0].map(l => {
          return l.map(o => tv(o))
        }).join('')
        return v
      }
    %}

placement ->
	  %LEFT_OF  {% (d) => yy.PLACEMENT.LEFTOF %}
	| %RIGHT_OF {% (d) => yy.PLACEMENT.RIGHTOF %}

note_statement ->
	  ("note"|%START_NOTE) _ placement _ actor _ textWithColon %NEWLINE {%
      function(d) {
        // console.log('[note one]\n', d[5])
        return [d[4], { type:'addNote', placement: d[2], actor: d[4].actor, text: d[6] }]
      }
    %}
	| ("note"|%START_NOTE) _ placement _ actor multilineNoteText {%
      function(d) {
        // console.log('[note multi]\n', d[5])
        const text = d[5]
        const message = yy.parseMessage(text)
        return [message, { type:'addNote', placement: d[2], actor: d[4].actor, text: message }]
      }
    %}
	| ("note"|%START_NOTE) _ "over" _ actor_pair _ textWithColon %NEWLINE {%
      function(d) {
        // console.log('[note over]\n', d[5])
        const actors = [d[4][0].actor, d[4][1].actor]
        return [
          d[4], {type:'addNote', placement: yy.PLACEMENT.OVER, actor: actors, text: d[6]}
        ]
      }
    %}

actor_pair -> actor %COMMA actor {% (d) => ([d[0], d[2]]) %}
	| actor {% id %}

else_sections -> document
	| document _ "else" words %NEWLINE else_sections {%
    function(d) {
      // console.log('[else_sections]', d)
      return d[0].concat([
        {type: 'else', altText: yy.parseMessage(d[3]), signalType: yy.LINETYPE.ALT_ELSE},
        d[5],
      ])
    }
  %}

par_sections ->
	  document
	| document _ "and" words %NEWLINE par_sections {%
    function(d) {
      return d[0].concat([
        {type: 'and', altText: yy.parseMessage(d[3]), signalType: yy.LINETYPE.PAR_AND},
        d[5],
      ])
    }
  %}
