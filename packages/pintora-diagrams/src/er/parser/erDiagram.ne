@{%
import * as moo from 'moo'
let lexer = moo.compile({
  NEWLINE: { match: /\n/, lineBreaks: true },
  SPACE: {match: /\s+/, lineBreaks: true},
  WORD: /\"[^"]*\"/,
  ZERO_OR_ONE: /\|o|o\|/,
  ZERO_OR_MORE: /\}o|o\{/,
  ONE_OR_MORE: /\}\||\|\{/,
  ONLY_ONE: /\|\|/,
  NON_IDENTIFYING: /\.\.|\.\-|\-\./,
  IDENTIFYING: /\-\-/,
  ALPHANUM: /[A-Za-z][A-Za-z0-9\-_]*/,
  COLON: /:/,
  LEFT_BRACE: /\{/,
  RIGHT_BRACE: /\}/,
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

program -> "erDiagram" document

document -> null
  | document line

line ->
    _ statement
	| %NEWLINE

statement ->
    directive
  | entityName _ relSpec _ entityName _ %COLON _ role
    {%
      function(d) {
        yy.addEntity(tv(d[0]));
        yy.addEntity(tv(d[4]));
        yy.addRelationship(tv(d[0]), tv(d[8]), tv(d[4]), d[2])
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

# FIXME: directive for inline config, this should be common rule
directive -> "open_directive"

# directive ->
#     openDirective typeDirective closeDirective %NEWLINE
#   | openDirective typeDirective ':' argDirective closeDirective %NEWLINE

# openDirective ->
#     open_directive {% yy.parseDirective('%%{', 'open_directive'); %}

# typeDirective ->
#     type_directive { yy.parseDirective($1, 'type_directive'); }

# argDirective ->
#     arg_directive { $1 = $1.trim().replace(/'/g, '"'); yy.parseDirective($1, 'arg_directive'); }

# closeDirective ->
#     close_directive { yy.parseDirective('}%%', 'close_directive', 'er'); }

entityName ->
    %ALPHANUM {% id %}

attributes ->
      attribute {% id %}
    | attribute __ attributes {% (d) => [d[0]].concat(d[2]) %}

attribute ->
      attributeType __ attributeName {% (d) => { return { attributeType: tv(d[0]), attributeName: tv(d[2]) } } %}

attributeType -> %ALPHANUM {% id %}

attributeName -> %ALPHANUM {% id %}

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
      %WORD       {% (d) => d[0].replace(/"/g, '') %}
    | %ALPHANUM   {% id %}

