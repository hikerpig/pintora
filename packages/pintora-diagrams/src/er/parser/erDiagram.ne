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
} from '../../util/parser-shared'
import { ErDb } from '../db'

let lexer = moo.compile({
  NL: { match: /\n/, lineBreaks: true },
  WS: {match: /\s+/, lineBreaks: true},
  WORD: /\"[^"]*\"/,
  ZERO_OR_ONE: /\|o|o\|/,
  ZERO_OR_MORE: /\}o|o\{/,
  ONE_OR_MORE: /\}\||\|\{/,
  ONLY_ONE: /\|\|/,
  NON_IDENTIFYING: /\.\.|\.\-|\-\./,
  IDENTIFYING: /\-\-/,
  COLON: /:/,
  LEFT_BRACE: /\{/,
  RIGHT_BRACE: /\}/,
  PARAM_DIRECTIVE: /@param/, // for config.ne
  COMMENT_LINE: COMMENT_LINE_REGEXP,
  CONFIG_DIRECTIVE,
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
    %WS:* statement
	| %NL

statement ->
    entityName _ relSpec _ entityName _ %COLON _ role
    {%
      function(d) {
        yy.addEntity(tv(d[0]));
        yy.addEntity(tv(d[4]));
        yy.addRelationship(tv(d[0]), d[8], tv(d[4]), d[2])
      }
    %}
  | entityName _ "{" _ attributes _ "}"
    {%
      function(d) {
        yy.addEntity(tv(d[0]));
        yy.addAttributes(tv(d[0]), d[4]);
      }
    %}
  | entityName "{":? "}":? {% (d) => yy.addEntity(tv(d[0])) %}
  | entityName {% (d) => yy.addEntity(tv(d[0])) %}
  | paramClause _ %NL {%
      function(d) {
        const { type, ...styleParam } = d[0]
        yy.addParam(styleParam)
      }
    %}
  | configClause _ %NL {%
      function(d) {
        yy.addOverrideConfig(d[0])
      }
    %}
  | comment _ %NL

entityName ->
    %VALID_TEXT {% id %}

attributes ->
      attribute {% (d) => [d[0]] %}
    | attribute __ attributes {% (d) => {
        return [d[0]].concat(d[2]) }
      %}

attribute ->
      attributeType __ attributeName __ %VALID_TEXT _ %NL {%
        function(d) {
          return { attributeType: tv(d[0]), attributeName: tv(d[2]), attributeKey: tv(d[4]) }
        }
      %}
    | attributeType __ attributeName _ %NL {% (d) => { return { attributeType: tv(d[0]), attributeName: tv(d[2]) } } %}

attributeType -> %VALID_TEXT {% id %}

attributeName -> %VALID_TEXT {% id %}

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
      %WORD {% (d) => {
        return tv(d[0]).replace(/"/g, '')
      } %}
    | %VALID_TEXT {% (d) => tv(d[0]) %}
