@preprocessor typescript
@lexer lexer
@skip_unmatch %WS
@include "whitespace.ne"
@include "config.ne"
@include "comment.ne"
@include "bind.ne"

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
  makeNth,
  flatten,
  BIND_REGEXPS,
} from '../../util/parser-shared'
import type { Action } from '../db'
import { Relation } from '../db'

const COMMON_TOKEN_RULES = {
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
}

const _PLACEMENT = [
  { match: /left\sof/, type: () => 'LEFT_OF' },
  { match: /right\sof/, type: () => 'RIGHT_OF' },
  { match: /top\sof/, type: () => 'TOP_OF' },
  { match: /bottom\sof/, type: () => 'BOTTOM_OF' },
]

let lexer = moo.states({
  main: {
    NL: MOO_NEWLINE,
    WS: { match: /[ \t]+/, lineBreaks: false },
    QUOTED_WORD: QUOTED_WORD_REGEXP,
    COLOR: COLOR_REGEXP,
    SEMICOLON: /;/,
    COLON: /:/,
    CLASS_DIAGRAM: /classDiagram/,
    L_PAREN: L_PAREN_REGEXP,
    R_PAREN: R_PAREN_REGEXP,
    L_BRACKET: { match: /\{/ },
    R_BRACKET: { match: /\}/ },
    TEXT_WITH_ANGLE_BRACKETS: { match: /\<\<(?:.*)\>\>/ },
    EQ: { match: /=/ },
    SUBGRAPH: { match: /subgraph/ },
    NOTE: textToCaseInsensitiveRegex('@note'),
    START_NOTE: {
      match: /@start_note\s/,
      push: 'noteState',
    },
    _PLACEMENT,
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    ...configLexerMainState,
    ...BIND_REGEXPS,
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
    _PLACEMENT,
    NL: MOO_NEWLINE,
    VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
  }
})

function rNull() {
  return null
}

const nth0 = makeNth(0)
const nth1 = makeNth(1)
%}

start -> __ start {% nth1 %}
	| %CLASS_DIAGRAM document {%
      function(d) {
        return d[1]
      }
    %}

document -> null
  | document statementWrap {%
    (d) => {
        let r = d[0]
        if (d[1]) {
          r = d[0].concat(d[1])
        }
        return r
      }
    %}

statementWrap ->
	  %WS:* statement {% (d) => {
      return d[1]
    } %}
	| %WS:? %NL {% null %}

statement ->
    classStatement
  | memberLabelStatement
  | relationStatement
  | classAnnotationStatement
  | noteStatement
  | paramStatement %NL
  | configOpenCloseStatement %NL
  | comment %NL
  | bindClassStatement

classStatement ->
    "class" memberOrClassName %L_BRACKET %NL:? classMembers:? %NL:? %R_BRACKET %NL {%
      function(d) {
        const members = d[4]
        return {
          type: 'addClass',
          name: d[1],
          members,
        } as Action
      }
    %}
  | "class" textInQuote "as" %VALID_TEXT %NL {%
      function(d) {
        return {
          type: 'addClass',
          name: tv(d[3]),
          label: d[1],
          members: [],
        } as Action
      }
    %}
  | "class" %VALID_TEXT %NL {%
      function(d) {
        return {
          type: 'addClass',
          name: tv(d[1]),
          members: [],
        } as Action
      }
    %}

classMembers ->
    classMember
  | annotation
  | classMembers %NL (annotation | classMember) {%
      function(d) {
        return [...d[0], ...d[2]]
      }
    %}

classMember ->
    modifier:? memberLabel {%
      function(d) {
        const modifier = d[0] ? d[0] : null
        return {
          raw: d[1],
          modifier,
        }
      }
    %}

words ->
    (%VALID_TEXT | %COLOR) (%VALID_TEXT | %COLOR | %WS):* {%
      function(d) {
        return tv(d[0][0]) + d[1].map(o => tv(o[0])).join('')
      }
    %}

memberLabel ->
    memberOrClassName (%VALID_TEXT | %COLOR | %L_PAREN | %R_PAREN | %COLON | %WS):* {%
      function(d) {
        return d[0] + d[1].map(o => tv(o[0])).join('')
      }
    %}

memberOrClassName ->
    (%VALID_TEXT | %COLOR):+ {%
      function(d) {
        const tokens = flatten(d)
        const result = tokens.map(inner => tv(inner)).join('')
        return result
      }
    %}


modifier -> %L_BRACKET ("static" | "abstract") %R_BRACKET {%
      function(d) {
        return tv(d[1][0])
      }
    %}

memberLabelStatement ->
    %VALID_TEXT %COLON classMember %NL {%
        function(d) {
          const className = tv(d[0])
          const member = d[2]
          if (className === 'title') {
            // a special case for title statement. `title: Some text`
            return {
              type: 'setTitle',
              text: member.raw,
            }
          }
          return {
            type: 'addClassMember',
            className,
            member,
          } as Action
        }
      %}

relationStatement ->
    classInRelation textInQuote:? relation textInQuote:? classInRelation (%WS:* %COLON %WS:* words):? {%
        function(d) {
          let relationRaw = { type: d[2], dashed: false, reversed: false }
          let labelLeft = d[1]
          let labelRight = d[3]
          if (d[2].type) {
            relationRaw = d[2]
          }
          let label = ''
          if (d[5]) {
            label = d[5][3]
          }
          return {
            type: 'addRelation',
            left: d[0].name,
            right: d[4].name,
            relationRaw: d[2],
            labelLeft,
            labelRight,
            label,
            dashed: Boolean(relationRaw.dashed),
            reversed: Boolean(relationRaw.reversed)
          } as Action
        }
      %}

classInRelation ->
    memberOrClassName {% (d) => ({ name: d[0] }) %}

relation ->
    "<|--" {% (d) => { return { type: Relation.INHERITANCE, reversed: true } } %}
  | "<|.." {% (d) => { return { type: Relation.INHERITANCE, reversed: true, dashed: true } } %}
  | "--|>" {% (d) => { return { type: Relation.INHERITANCE } } %}
  | "..|>" {% (d) => { return { type: Relation.INHERITANCE, dashed: true } } %}
  | "*--"  {% (d) => { return { type: Relation.COMPOSITION, reversed: true } } %}
  | "*.."  {% (d) => { return { type: Relation.COMPOSITION, reversed: true, dashed: true } } %}
  | "--*"  {% (d) => { return { type: Relation.COMPOSITION } } %}
  | "..*"  {% (d) => { return { type: Relation.COMPOSITION, dashed: true } } %}
  | "o--"  {% (d) => { return { type: Relation.AGGREGATION, reversed: true } } %}
  | "o.."  {% (d) => { return { type: Relation.AGGREGATION, reversed: true, dashed: true } } %}
  | "--o"  {% (d) => { return { type: Relation.AGGREGATION } } %}
  | "..o"  {% (d) => { return { type: Relation.AGGREGATION, dashed: true } } %}
  | "-->"  {% (d) => { return { type: Relation.ASSOCIATION } } %}
  | "..>"  {% (d) => { return { type: Relation.ASSOCIATION, dashed: true } } %}
  | "<--"  {% (d) => { return { type: Relation.ASSOCIATION, reversed: true } } %}
  | "<.."  {% (d) => { return { type: Relation.ASSOCIATION, reversed: true, dashed: true } } %}
  | "--"   {% (d) => { return { type: Relation.LINK } } %}
  | ".."   {% (d) => { return { type: Relation.LINK, dashed: true } } %}

classAnnotationStatement ->
    annotation classInRelation {%
        function(d) {
          return {
            type: 'addAnnotation',
            annotation: d[0].annotation,
            className: d[1].name,
          } as Action
        }
      %}

annotation ->
    %TEXT_WITH_ANGLE_BRACKETS {%
        function(d) {
          const v = tv(d[0])
          return {
            type: 'annotation',
            annotation: v.replace(/\<\<(.*)\>\>/, '$1').trim(),
          }
        }
      %}

textInQuote ->
    %QUOTED_WORD {%
        function(d) {
          return getQuotedWord(d[0])
        }
      %}

placement ->
	  %LEFT_OF  {% (d) => 'LEFT_OF' %}
	| %RIGHT_OF {% (d) => 'RIGHT_OF' %}
	| %TOP_OF {% (d) => 'TOP_OF' %}
	| %BOTTOM_OF {% (d) => 'BOTTOM_OF' %}

multilineNoteText ->
    (%VALID_TEXT|%QUOTED_WORD|%NL):* %END_NOTE {%
      function(d) {
        // console.log('[multiline text]', d)
        const v = d[0].map(l => {
          return l.map(o => tv(o))
        }).join('')
        return v
      }
    %}

noteStatement ->
	  ("note" | %NOTE) %WS:* placement %WS memberOrClassName %WS:* %COLON words %NL {%
      function(d) {
        const text = d[7].trim()
        // console.log('[note one]\n', text)
        return { type: 'note', placement: d[2], target: d[4].trim(), text } as Action
      }
    %}
	| ("note" | %START_NOTE) %WS:* placement %WS:* memberOrClassName %WS:* %NL multilineNoteText %NL {%
      function(d) {
        // console.log('[note multi]\n', d[5])
        const text = d[7]
        return { type: 'note', placement: d[2], target: d[4].trim(), text } as Action
      }
    %}
