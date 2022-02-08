@preprocessor typescript
@lexer lexer
@builtin "whitespace.ne"
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
  configLexerMainState,
  configLexerConfigClauseState,
  L_PAREN_REGEXP,
  R_PAREN_REGEXP,
} from '../../util/parser-shared'

let lexer = moo.states({
  main: {
    NL: { match: /\n/, lineBreaks: true },
    WS: {match: / +/, lineBreaks: false },
    ...configLexerMainState,
    QUOTED_WORD: QUOTED_WORD_REGEXP,
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
    L_SQ_BRACKET: { match: /\[/ },
    R_SQ_BRACKET: { match: /\]/ },
    L_AN_BRACKET: { match: /\</ },
    R_AN_BRACKET: { match: /\>/ },
    L_PAREN: L_PAREN_REGEXP,
    R_PAREN: R_PAREN_REGEXP,
    _PLACEMENT: [
      { match: /left\sof/, type: () => 'LEFT_OF' },
      { match: /right\sof/, type: () => 'RIGHT_OF' },
    ],
    COLOR: /#[a-zA-Z0-9]+/,
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    WORD: { match: VALID_TEXT_REGEXP, fallback: true },
  },
  line: {
    REST_OF_LINE: { match: /[^#\n;]+/, pop: 1 },
  },
  configClause: {
    ...configLexerConfigClauseState,
    WORD: { match: VALID_TEXT_REGEXP, fallback: true },
  },
})

let yy

export function setYY(v) {
  yy = v
}
%}

start -> __ start {% (d) => d[1] %}
	| "sequenceDiagram" document __:? {%
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
	  %WS:* statement {% (d) => {
      // console.log('[line]', JSON.stringify(d[1], null, 2))
      return d[1]
    } %}
	| %NL

statement ->
	  participantWord __ classifiableActor __ "as" __ %QUOTED_WORD _ %NL {%
      function(d) {
        const aliasWithQuotes = tv(d[6])
        d[2].description = yy.parseMessage(aliasWithQuotes.slice(1, aliasWithQuotes.length - 1))
        return d[2]
      }
    %}
	| participantWord __ classifiableActor %NL {%
      function(d) {
        return d[2]
      }
    %}
	| signal %NL {% id %}
	| "autonumber" %NL {% (d) => yy.enableSequenceNumbers() %}
	| "activate" _ actor %NL {%
      function(d) {
        return {
          type: 'activeStart', signalType: yy.LINETYPE.ACTIVE_START, actor: d[2]
        }
      }
    %}
	| "deactivate" _ actor %NL {%
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
	| "title" textWithColon %NL {% (d) => ({ type:'setTitle', text: d[1] }) %}
	| ("loop"|"opt") __ color:? words %NL document _ "end" _ %NL {%
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
	| ("par") __ color:? words %NL par_sections _ "end" _ %NL {%
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
	| ("alt") __ color:? words %NL else_sections _ "end" _ %NL {%
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
  | "==" __ (%WORD | %WS):+ __ "==" _ %NL {%
      function(d) {
        const text = d[2].map(o => tv(o[0])).join('').trim()
        return { type: 'addDivider', text, signalType: yy.LINETYPE.DIVIDER }
      }
    %}
  | paramClause _ %NL
  | configOpenCloseClause _ %NL
  | comment _ %NL

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
	  actor _ signaltype (%PLUS | %MINUS) _ actor _ textWithColon {%
      function(d) {
        const toActor = d[5]
        const activeMark = d[3][0]
        let activeAction
        if (activeMark.type === 'MINUS') {
          activeAction = {type: 'activeEnd', signalType: yy.LINETYPE.ACTIVE_END, actor: toActor }
        } else {
          activeAction = { type: 'activeStart', signalType: yy.LINETYPE.ACTIVE_START, actor: toActor }
        }
        return [
          d[0], toActor,
          { type: 'addSignal', from: d[0].actor, to: toActor.actor, signalType: d[2], msg: d[7] },
          activeAction,
        ]
      }
    %}
	| actor _ signaltype _ actor _ textWithColon {%
      function(d) {
        // console.log('got message', d)
        const toActor = d[4]
        return [
          d[0], toActor,
          {type: 'addSignal', from: d[0].actor, to: toActor.actor, signalType: d[2], msg: d[6]},
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
    (%WORD|%WS|%NL):* %END_NOTE {%
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
	  ("note"|%START_NOTE) _ placement _ actor _ textWithColon %NL {%
      function(d) {
        // console.log('[note one]\n', d)
        return [d[4], { type:'addNote', placement: d[2], actor: d[4].actor, text: d[6] }]
      }
    %}
	| ("note"|%START_NOTE) _ placement _ actor multilineNoteText %NL {%
      function(d) {
        // console.log('[note multi]\n', d[5])
        const text = d[5]
        const message = yy.parseMessage(text)
        return [d[4], { type:'addNote', placement: d[2], actor: d[4].actor, text: message }]
      }
    %}
	| ("note"|%START_NOTE) _ "over" _ actor_pair _ textWithColon %NL {%
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
	| document _ "else" __ color:? words %NL else_sections {%
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
	| document _ "and" __ color:? words %NL par_sections {%
    function(d) {
      const background = d[4] ? d[4]: null
      const text = yy.parseMessage(d[5])
      return d[0].concat([
        {type: 'groupStart', groupType: 'and', text, signalType: yy.LINETYPE.PAR_AND, background },
        d[7],
      ])
    }
  %}
