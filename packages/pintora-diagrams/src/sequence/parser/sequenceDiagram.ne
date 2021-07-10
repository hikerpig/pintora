@{%
import * as moo from 'moo'

const LETTER_REGEXP = /[a-zA-Z]/;
const isCharLetter= (char) => LETTER_REGEXP.test(char);

// from moo issue: https://github.com/no-context/moo/issues/117
function textToCaseInsensitiveRegex(text) {
  const regexSource = text.split('').map((char) => {
    if (isCharLetter(char)) {
      return `[${char.toLowerCase()}${char.toUpperCase()}]`;
    }

    return char;
  });

  return new RegExp(regexSource.join(''));
};

let lexer = moo.states({
  main: {
    NEWLINE: { match: /\n/, lineBreaks: true },
    SPACE: {match: /\s+/, lineBreaks: true},
    AUTONUMBER: /autonumber/,
    TITLE: 'title',
    PARTICIPANT: 'participant',
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
    _BOX: [
      { match: textToCaseInsensitiveRegex('loop'), push: 'line', type: () => 'LOOP' },
      { match: textToCaseInsensitiveRegex('opt'), push: 'line', type: () => 'OPT' },
      { match: textToCaseInsensitiveRegex('alt'), push: 'line', type: () => 'ALT' },
      { match: textToCaseInsensitiveRegex('else'), push: 'line', type: () => 'ELSE' },
      { match: textToCaseInsensitiveRegex('par'), push: 'line', type: () => 'PAR' },
      { match: textToCaseInsensitiveRegex('and'), push: 'line', type: () => 'AND' },
    ],
    PLUS: /\+/,
    MINUS: /-/,
    COMMA: /,/,
    COLON: { match: /:/, push: 'line' },
    _PLACEMENT: [
      { match: /left\sof/, type: () => 'LEFT_OF' },
      { match: /right\sof/, type: () => 'RIGHT_OF' },
    ],
    // WORD: { match: /(?:[a-zA-Z0-9_])+/, fallback: true },
    WORD: { match: /(?:[a-zA-Z0-9_]\p{Unified_Ideograph})+/, fallback: true },
  },
  line: {
    REST_OF_LINE: { match: /[^#\n;]+/, pop: 1 },
  },
})

let yy

export function setYY(v) {
  yy = v
}

// token value
function tv(token) {
  return token.value
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
        // console.log('[doc line]', d)
        return d[1]
      }
    %}

line ->
	  %SPACE:* statement {% (d) => {
      // console.log('[line]', JSON.stringify(d))
      return d[1]
    } %}
	| %NEWLINE

statement ->
	  %PARTICIPANT __ actor __ "as" __ %WORD %NEWLINE {%
      function(d) {
        d[2].description = yy.parseMessage(tv(d[6]))
        return d[2]
      }
    %}
	| %PARTICIPANT __ actor %NEWLINE {%
      function(d) {
        return d[2]
      }
    %}
	| signal %NEWLINE {% id %}
	| %AUTONUMBER %NEWLINE {% (d) => yy.enableSequenceNumbers() %}
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
	| %TITLE textWithColon %NEWLINE {% (d) => ({ type:'setTitle', text: d[1] }) %}
	| %LOOP %REST_OF_LINE document _ "end" {%
      function(d) {
        // console.log('[loop]', d)
        const loopText = yy.parseMessage(tv(d[1]) || '')
        const result = [
          {type: 'loopStart', loopText, signalType: yy.LINETYPE.LOOP_START},
          d[2],
          {type: 'loopEnd', loopText, signalType: yy.LINETYPE.LOOP_END },
        ]
        return result
      }
    %}
	| %OPT %REST_OF_LINE document _ "end" {%
      function(d) {
        // console.log('[opt]', d)
        const optText = yy.parseMessage(tv(d[1]))
        const result = [
          {type: 'optStart', optText, signalType: yy.LINETYPE.OPT_START},
          d[2],
          {type: 'optEnd', optText, signalType: yy.LINETYPE.OPT_END },
        ]
        return result
      }
    %}
	| %ALT %REST_OF_LINE else_sections _ "end" {%
      function(d) {
        // console.log('[alt]')
        const altText = yy.parseMessage(tv(d[1]))
        const result = [
          {type: 'altStart', altText, signalType: yy.LINETYPE.ALT_START},
          d[2],
          {type: 'altEnd', altText, signalType: yy.LINETYPE.ALT_END },
        ]
        return result
      }
  %}
	| %PAR %REST_OF_LINE par_sections _ "end" {%
      function(d) {
        const parText = yy.parseMessage(tv(d[1]))
        const result = [
          {type: 'parStart', parText, signalType: yy.LINETYPE.PAR_START},
          d[2],
          {type: 'parEnd', parText, signalType: yy.LINETYPE.PAR_END },
        ]
        return {}
      }
    %}
  | "==" __ (%WORD | %SPACE):+ __ "==" {%
      function(d) {
        const text = d[2].map(o => tv(o[0])).join('').trim()
        return { type: 'addDivider', text, signalType: yy.LINETYPE.DIVIDER }
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
	| document _ %ELSE %REST_OF_LINE else_sections {%
    function(d) {
      // console.log('[else_sections]', d)
      return d[0].concat([
        {type: 'else', altText: yy.parseMessage(tv(d[3])), signalType: yy.LINETYPE.ALT_ELSE},
        d[4],
      ])
    }
  %}

par_sections ->
	  document
	| document _ %AND %REST_OF_LINE par_sections {%
    function(d) {
      return d[0].concat([
        {type: 'and', altText: yy.parseMessage(tv(d[3])), signalType: yy.LINETYPE.PAR_AND},
        d[4],
      ])
    }
  %}
