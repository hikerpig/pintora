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
  MOO_NEWLINE,
  getQuotedWord,
} from '../../util/parser-shared'
import db, { ApplyParam } from '../db'

const _PLACEMENT = [
  { match: /left\sof/, type: () => 'LEFT_OF' },
  { match: /right\sof/, type: () => 'RIGHT_OF' },
  { match: /over/, type: () => 'OVER' },
]

let lexer = moo.states({
  main: {
    NL: MOO_NEWLINE,
    WS: {match: / +/, lineBreaks: false },
    ...configLexerMainState,
    QUOTED_WORD: QUOTED_WORD_REGEXP,
    NOTE: textToCaseInsensitiveRegex('@note'),
    START_NOTE: {
      match: /@start_note\s/,
      push: 'noteState',
    },
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
    L_SQ_BRACKET: { match: /\[/ },
    R_SQ_BRACKET: { match: /\]/ },
    L_AN_BRACKET: { match: /\</ },
    R_AN_BRACKET: { match: /\>/ },
    L_PAREN: L_PAREN_REGEXP,
    R_PAREN: R_PAREN_REGEXP,
    _PLACEMENT,
    COLOR: /#[a-zA-Z0-9]+/,
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    WORD: { match: VALID_TEXT_REGEXP, fallback: true },
  },
  line: {
    REST_OF_LINE: { match: /[^#\n;]+/, pop: 1 },
  },
  configStatement: {
    ...configLexerconfigStatementState,
    WORD: { match: VALID_TEXT_REGEXP, fallback: true },
  },
  noteState: {
    _PLACEMENT,
    END_NOTE: {
      match: textToCaseInsensitiveRegex('@end_note'),
      pop: 1,
    },
    NL: MOO_NEWLINE,
    COMMA: /,/,
    WORD: { match: VALID_TEXT_REGEXP, fallback: true },
  }
})

let yy: typeof db

export function setYY(v) {
  yy = v
}

%}

start -> __ start {% (d) => d[1] %}
	| "sequenceDiagram" document {%
      function(d) {
        // console.log('[sequenceDiagram]', JSON.stringify(d, null, 2))
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
	  %WS:? statement {% (d) => {
      return d[1]
    } %}
  | %WS:? %NL {% null %}

statement ->
    participantStatement {% id %}
	| "box" color:? %QUOTED_WORD:? %NL participantStatement:* "endbox" %NL {%
      function(d) {
        const title = d[2] ? getQuotedWord(d[2]): null
        const background = d[1] ? d[1]: null
        return {
          type: 'addBox',
          text: title,
          children: d[4],
          background,
        } as ApplyParam
      }
    %}
	| signal %NL {% id %}
	| "autonumber" %WS:? %NL {% (d) => yy.enableSequenceNumbers() %}
	| "activate" %WS actor %NL {%
      function(d) {
        return {
          type: 'activeStart', signalType: yy.LINETYPE.ACTIVE_START, actor: d[2]
        }
      }
    %}
	| "deactivate" %WS actor %NL {%
      function(d) {
        return {
          type: 'activeEnd', signalType: yy.LINETYPE.ACTIVE_END, actor: d[2]
        }
      }
    %}
	| noteStatement {% (d) => {
    // console.log('[note_a]', d)
    return d[0]
  } %}
	| "title" textWithColon %NL {% (d) => ({ type:'setTitle', text: d[1] }) %}
	| ("loop"|"opt") %WS color:? words %NL document _ "end" _ %NL {%
      function(d) {
        // console.log('[loop]', d[5])
        const groupType = tv(d[0][0])
        const text = yy.parseMessage(d[3])
        const background = d[2] ? d[2]: null
        const result = [
          {type: 'groupStart', text, groupType, background },
          d[5],
          {type: 'groupEnd', groupType },
        ]
        return result
      }
    %}
	| ("par") %WS color:? words %NL par_sections _ "end" _ %NL {%
      function(d) {
        const groupType = tv(d[0][0])
        const text = yy.parseMessage(d[3])
        const background = d[2] ? d[2]: null
        const result = [
          {type: 'groupStart', text, groupType, background },
          d[5],
          {type: 'groupEnd', groupType },
        ]
        return result
      }
    %}
	| ("alt") %WS color:? words %NL else_sections _ "end" _ %NL {%
      function(d) {
        const groupType = tv(d[0][0])
        const text = yy.parseMessage(d[3])
        const background = d[2] ? d[2]: null
        const result = [
          {type: 'groupStart', text, groupType, background },
          d[5],
          {type: 'groupEnd', groupType },
        ]
        return result
      }
    %}
  | "==" %WS (%WORD | %WS):+ %WS "==" _ %NL {%
      function(d) {
        const text = d[2].map(o => tv(o[0])).join('').trim()
        return { type: 'addDivider', text, signalType: yy.LINETYPE.DIVIDER }
      }
    %}
  | paramStatement %NL
  | configOpenCloseStatement %NL
  | comment %NL

participantWord ->
    "participant"

classifiableActor ->
    %L_SQ_BRACKET %L_AN_BRACKET %WORD %R_AN_BRACKET __ actor "]" {%
      function(d) {
        const actor = d[5]
        actor.classifier = tv(d[2])
        return actor
      }
    %}
  | actor {% id %}

participantStatement ->
	  participantWord %WS classifiableActor %WS "as" %WS %QUOTED_WORD %NL {%
      function(d) {
        d[2].description = yy.parseMessage(getQuotedWord(d[6]))
        return d[2]
      }
    %}
  | participantWord %WS classifiableActor %WS "as" %WS words %NL {%
      function(d) {
        const alias = d[6]
        d[2].description = yy.parseMessage(alias)
        return d[2]
      }
    %}
	| participantWord %WS classifiableActor %WS:? %NL {%
      function(d) {
        return d[2]
      }
    %}

words -> (%WORD | %WS):+ {%
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
	  actor signaltype (%PLUS | %MINUS) actor textWithColon {%
      function(d) {
        const toActor = d[3]
        const fromActor = d[0]
        const activeMark = d[2][0]
        let activeAction
        if (activeMark.type === 'MINUS') {
          activeAction = {type: 'activeEnd', signalType: yy.LINETYPE.ACTIVE_END, actor: fromActor }
        } else {
          activeAction = { type: 'activeStart', signalType: yy.LINETYPE.ACTIVE_START, actor: toActor }
        }
        return [
          fromActor, toActor,
          { type: 'addSignal', from: fromActor.actor, to: toActor.actor, signalType: d[1], msg: d[4] },
          activeAction,
        ]
      }
    %}
	| actor signaltype actor textWithColon {%
      function(d) {
        // console.log('got message', d)
        const toActor = d[2]
        return [
          d[0], toActor,
          {type: 'addSignal', from: d[0].actor, to: toActor.actor, signalType: d[1], msg: d[3]},
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
    (%WORD|%COMMA|%NL):* %END_NOTE {%
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

noteStatement->
	  ("note" | %NOTE) placement actor textWithColon %NL {%
      function(d) {
        // console.log('[note one]\n', d)
        const actor = d[2].actor.trim()
        return [actor, { type:'addNote', placement: d[1], actor, text: d[3] }]
      }
    %}
	| ("note" | %START_NOTE) placement actor %NL multilineNoteText %NL {%
      function(d) {
        // console.log('[note multi]\n', d[5])
        const message = yy.parseMessage(d[4])
        const actor = d[2].actor.trim()
        return [actor, { type:'addNote', placement: d[1], actor, text: message }]
      }
    %}
	| ("note" | %NOTE) %OVER actor_pair textWithColon %NL {%
      function(d) {
        // console.log('[note over]\n', d[2])
        const actors = [d[2][0].actor.trim(), d[2][1].actor]
        return [
          d[2], {type:'addNote', placement: yy.PLACEMENT.OVER, actor: actors, text: d[3]}
        ]
      }
    %}
	| ("note" | %START_NOTE) %OVER actor_pair %NL multilineNoteText %NL {%
      function(d) {
        // console.log('[note multi]\n', d)
        const actors = [d[2][0].actor.trim(), d[2][1].actor]
        const message = yy.parseMessage(d[4])
        return [d[2], { type:'addNote', placement: yy.PLACEMENT.OVER, actor: actors, text: message }]
      }
    %}

actor_pair -> actor %COMMA actor {% (d) => ([d[0], d[2]]) %}
	| actor {% id %}

else_sections -> document
	| document _ "else" %WS color:? words %NL else_sections {%
    function(d) {
      const background = d[4] ? d[4]: null
      const text = yy.parseMessage(d[5])
      return d[0].concat([
        {type: 'groupStart', groupType: 'else', text, signalType: yy.LINETYPE.ALT_ELSE, background },
        d[7],
      ])
    }
  %}

par_sections ->
	  document
	| document _ "and" %WS color:? words %NL par_sections {%
    function(d) {
      const background = d[4] ? d[4]: null
      const text = yy.parseMessage(d[5])
      return d[0].concat([
        {type: 'groupStart', groupType: 'and', text, signalType: yy.LINETYPE.PAR_AND, background },
        d[7],
      ])
    }
  %}
