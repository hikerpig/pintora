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
  makeNth,
} from '../../util/parser-shared'
import type { Action } from '../db'
import { Relation } from '../db'

const COMMON_TOKEN_RULES = {
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
}

let lexer = moo.states({
  main: {
    NL: MOO_NEWLINE,
    WS: { match: /[ \t]+/, lineBreaks: false },
    QUOTED_WORD: QUOTED_WORD_REGEXP,
    COLOR: COLOR_REGEXP,
    SEMICOLON: /;/,
    COLON: /:/,
    COMMA: /,/,
    CLASS_DIAGRAM: /classDiagram/,
    L_PAREN: L_PAREN_REGEXP,
    R_PAREN: R_PAREN_REGEXP,
    L_BRACKET: { match: /\{/ },
    R_BRACKET: { match: /\}/ },
    L_SQ_BRACKET: { match: /\[/ },
    R_SQ_BRACKET: { match: /\]/ },
    TEXT_WITH_ANGLE_BRACKETS: { match: /\<\<(?:.*)\>\>/ },
    EQ: { match: /=/ },
    // RELATION_INHERITANCE: { match: /\<\|\-\-/ },
    SUBGRAPH: { match: /subgraph/ },
    START_NOTE: textToCaseInsensitiveRegex('@note'),
    END_NOTE: textToCaseInsensitiveRegex('@end_note'),
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    ...configLexerMainState,
    VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
  },
  configStatement: {
    ...configLexerconfigStatementState,
    ...COMMON_TOKEN_RULES,
  },
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
  | paramStatement %NL
  | configOpenCloseStatement %NL
  | comment %NL

classStatement ->
    "class" %VALID_TEXT %L_BRACKET %NL:? classMembers:? %NL:? %R_BRACKET %NL {%
      function(d) {
        const members = d[4]
        return {
          type: 'addClass',
          name: tv(d[1]),
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
    %VALID_TEXT (%VALID_TEXT | %WS):* {%
      function(d) {
        return tv(d[0]) + d[1].map(o => tv(o[0])).join('')
      }
    %}

memberLabel ->
    %VALID_TEXT (%VALID_TEXT | %L_PAREN | %R_PAREN | %COLON | %WS):* {%
      function(d) {
        return tv(d[0]) + d[1].map(o => tv(o[0])).join('')
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
          return {
            type: 'addClassMember',
            className,
            member: d[2]
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
    %VALID_TEXT {% (d) => ({ name: tv(d[0])}) %}

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
