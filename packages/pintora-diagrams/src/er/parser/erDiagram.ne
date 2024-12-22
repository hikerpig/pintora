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
  MOO_NEWLINE,
  getQuotedWord,
  BIND_REGEXPS,
} from '../../util/parser-shared'
import type { ErDb, Attribute } from '../db'

let lexer = moo.compile({
  NL: MOO_NEWLINE,
  WS: { match: / +/, lineBreaks: false },
  QUOTED_WORD: QUOTED_WORD_REGEXP,
  ZERO_OR_ONE: /\|o|o\|/,
  ZERO_OR_MORE: /\}o|o\{/,
  ONE_OR_MORE: /\}\||\|\{/,
  ONLY_ONE: /\|\|/,
  NON_IDENTIFYING: /\.\.|\.\-|\-\./,
  IDENTIFYING: /\-\-/,
  COLON: /:/,
  LEFT_BRACE: /\{/,
  RIGHT_BRACE: /\}/,
  INHERIT: /inherit/,
  PARAM_DIRECTIVE: /@param/, // for config.ne
  COMMENT_LINE: COMMENT_LINE_REGEXP,
  CONFIG_DIRECTIVE,
  ...BIND_REGEXPS,
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
})

let yy: ErDb

export function setYY(v) {
  yy = v
}
%}

start -> __ start
  | "erDiagram" document

document -> null
  | document line

line ->
    %WS:? statement
	| %NL {% null %}

statement ->
    entityName %WS:* relSpec %WS:* entityName %COLON role %NL {%
      function(d) {
        yy.addEntity(d[0]);
        yy.addEntity(d[4]);
        yy.addRelationship(d[0], d[6], d[4], d[2])
      }
    %}
  | entityName %WS %INHERIT %WS entityName %WS:* %NL {% (d) => {
      yy.addEntity(d[4])
      yy.addEntity(d[0])
      const sup = d[4]
      const sub = d[0]
      yy.addInheritance(sup, sub)
    } %}
  | entityName __ "{" __ attributes:? _ "}" %NL {%
      function(d) {
        yy.addEntity(d[0]);
        if (d[4]) {
          yy.addAttributes(d[0], d[4]);
        }
      }
    %}
  | entityName "{" "}" %NL {% (d) => yy.addEntity(d[0]) %}
  | entityName %WS:* %NL {% (d) => yy.addEntity(d[0]) %}
  | titleStatement
  | paramStatement %WS:* %NL {%
      function(d) {
        const { type, ...styleParam } = d[0]
        yy.addParam(styleParam)
      }
    %}
  | configStatement %WS:* %NL {%
      function(d) {
        yy.addOverrideConfig(d[0])
      }
    %}
  | bindClassStatement %NL {%
      function(d) {
        yy.bindClass(d[0])
      }
    %}
  | comment %NL
  | %NL

entityName ->
    %VALID_TEXT {% (d) => tv(d[0]) %}

attributes ->
      attribute {% (d) => {
        return [d[0]]
      } %}
    | attribute __ attributes {% (d) => {
        return [d[0]].concat(d[2]) }
      %}

attribute ->
      attributeType %WS attributeName %WS %VALID_TEXT %WS:* %QUOTED_WORD:? %NL {%
        function(d): Attribute {
          const comment = d[6] ? getQuotedWord(d[6]): ''
          return { attributeType: d[0], attributeName: d[2], attributeKey: tv(d[4]), comment }
        }
      %}
    | attributeType %WS attributeName %WS:* %QUOTED_WORD:? %WS:* %NL {% (d): Attribute => {
        const comment = d[4] ? getQuotedWord(d[4]): ''
        return { attributeType: d[0], attributeName: d[2], comment } }
      %}

attributeType -> %VALID_TEXT {% (d) => tv(d[0]) %}

attributeName -> %VALID_TEXT {% (d) => tv(d[0]) %}

relSpec ->
      cardinality relType cardinality {%
        function(d) {
          return {
            cardA: d[2], relType: d[1], cardB: d[0],
          }
        }
      %}

cardinality ->
      %ZERO_OR_ONE                  {% (d) => yy.Cardinality.ZERO_OR_ONE %}
    | %ZERO_OR_MORE                 {% (d) => yy.Cardinality.ZERO_OR_MORE %}
    | %ONE_OR_MORE                  {% (d) => yy.Cardinality.ONE_OR_MORE %}
    | %ONLY_ONE                     {% (d) => yy.Cardinality.ONLY_ONE %}

relType ->
      %NON_IDENTIFYING              {% (d) => yy.Identification.NON_IDENTIFYING %}
    | %IDENTIFYING                  {% (d) => yy.Identification.IDENTIFYING %}

role ->
      %QUOTED_WORD {% (d) => {
        return getQuotedWord(d[0])
      } %}
    | %VALID_TEXT {% (d) => tv(d[0]) %}

titleStatement ->
	  "title" %COLON words %NL {% (d) => { yy.addTitle(d[2].trim()) } %}

words ->
    (%VALID_TEXT | %WS):+ {%
      function(d) {
        return d[0].map(o => tv(o[0])).join('')
      }
    %}
