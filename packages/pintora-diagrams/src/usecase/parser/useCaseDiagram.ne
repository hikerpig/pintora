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
  VALID_TEXT_REGEXP,
  COMMENT_LINE_REGEXP,
  QUOTED_WORD_REGEXP,
  L_PAREN_REGEXP,
  R_PAREN_REGEXP,
  MOO_NEWLINE,
  getQuotedWord,
  BIND_REGEXPS,
} from '../../util/parser-shared'
import type { RelationType } from '../db'

let lexer = moo.compile({
  NL: MOO_NEWLINE,
  WS: { match: / +/, lineBreaks: false },
  QUOTED_WORD: QUOTED_WORD_REGEXP,
  L_PAREN: L_PAREN_REGEXP,
  R_PAREN: R_PAREN_REGEXP,
  LEFT_BRACE: /\{/,
  RIGHT_BRACE: /\}/,
  ASSOCIATION: /-->/,
  INCLUDE_REL: /\.\.\>/,
  EXTEND_REL: /\<\.\./,
  GENERALIZATION_REL: /\<\|\-\-/,
  COLON: /:/,
  PARAM_DIRECTIVE: /@param/,
  COMMENT_LINE: COMMENT_LINE_REGEXP,
  CONFIG_DIRECTIVE,
  ...BIND_REGEXPS,
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
})

%}

start -> __ start
  | "useCaseDiagram" document

document -> null
  | document line

line ->
    %WS:? statement
	| %NL {% null %}

statement ->
    actorStatement {% id %}
  | useCaseStatement {% id %}
  | systemBoundaryStatement {% id %}
  | associationStatement {% id %}
  | includeStatement {% id %}
  | extendStatement {% id %}
  | generalizationStatement {% id %}
  | titleStatement
  | paramStatement %WS:* %NL
  | configStatement %WS:* %NL
  | bindClassStatement
  | comment %NL
  | %NL

actorStatement ->
    "actor" %WS actorName %WS "as" %WS actorLabel %NL {%
      function(d) {
        return {
          type: 'addActor',
          name: d[2],
          label: d[6],
        }
      }
    %}
  | "actor" %WS actorName %WS:* %NL {%
      function(d) {
        return {
          type: 'addActor',
          name: d[2],
        }
      }
    %}

actorName ->
    %VALID_TEXT {% (d) => tv(d[0]) %}
  | %QUOTED_WORD {% (d) => getQuotedWord(d[0]) %}

actorLabel ->
    %VALID_TEXT {% (d) => tv(d[0]) %}
  | %QUOTED_WORD {% (d) => getQuotedWord(d[0]) %}

useCaseStatement ->
    %L_PAREN useCaseName %R_PAREN %WS "as" %WS useCaseLabel %NL {%
      function(d) {
        return {
          type: 'addUseCase',
          name: d[1],
          label: d[6],
        }
      }
    %}
  | %L_PAREN useCaseName %R_PAREN %WS:* %NL {%
      function(d) {
        return {
          type: 'addUseCase',
          name: d[1],
        }
      }
    %}

useCaseName ->
    %VALID_TEXT {% (d) => tv(d[0]) %}
  | %QUOTED_WORD {% (d) => getQuotedWord(d[0]) %}

useCaseLabel ->
    %VALID_TEXT {% (d) => tv(d[0]) %}
  | %QUOTED_WORD {% (d) => getQuotedWord(d[0]) %}

systemBoundaryStatement ->
    ("rectangle" | "package") %WS systemBoundaryName %WS:* %LEFT_BRACE __ systemBoundaryContent __ %RIGHT_BRACE %NL {%
      function(d) {
        const results = []
        // Add system boundary
        results.push({
          type: 'addSystemBoundary',
          name: d[2],
          useCases: d[6].map((item: any) => item.name),
        })
        // Add all use cases inside boundary
        results.push(...d[6])
        return results
      }
    %}

systemBoundaryName ->
    %VALID_TEXT {% (d) => tv(d[0]) %}
  | %QUOTED_WORD {% (d) => getQuotedWord(d[0]) %}

systemBoundaryContent ->
    null {% () => [] %}
  | useCaseStatement __ systemBoundaryContent {% (d) => [d[0]].concat(d[2]) %}

associationStatement ->
    identifier %WS %ASSOCIATION %WS identifier %WS:* %NL {%
      function(d) {
        return {
          type: 'addRelation',
          from: d[0],
          to: d[4],
          relationType: 'ASSOCIATION' as RelationType,
        }
      }
    %}

includeStatement ->
    identifier %WS %INCLUDE_REL %WS identifier %WS:* %COLON %WS "include" %WS:* %NL {%
      function(d) {
        return {
          type: 'addRelation',
          from: d[0],
          to: d[4],
          relationType: 'INCLUDE' as RelationType,
          label: '<<include>>',
        }
      }
    %}

extendStatement ->
    identifier %WS %EXTEND_REL %WS identifier %WS:* %COLON %WS "extend" %WS:* %NL {%
      function(d) {
        return {
          type: 'addRelation',
          from: d[4],
          to: d[0],
          relationType: 'EXTEND' as RelationType,
          label: '<<extend>>',
        }
      }
    %}

generalizationStatement ->
    identifier %WS %GENERALIZATION_REL %WS identifier %WS:* %NL {%
      function(d) {
        return {
          type: 'addRelation',
          from: d[4],
          to: d[0],
          relationType: 'GENERALIZATION' as RelationType,
        }
      }
    %}

identifier ->
    %VALID_TEXT {% (d) => tv(d[0]) %}
  | %QUOTED_WORD {% (d) => getQuotedWord(d[0]) %}

titleStatement ->
	  "title" %COLON words %NL {% (d) => ({ type: 'setTitle', text: d[2].trim() }) %}

words ->
    (%VALID_TEXT | %WS):+ {%
      function(d) {
        return d[0].map(o => tv(o[0])).join('')
      }
    %}
