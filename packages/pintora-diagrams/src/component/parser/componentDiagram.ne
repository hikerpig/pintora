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
  VALID_TEXT_REGEXP,
  COMMENT_LINE_REGEXP,
  configLexerMainState,
  configLexerconfigStatementState,
  MOO_NEWLINE,
} from '../../util/parser-shared'

const commonTopRules = {
  NL: MOO_NEWLINE,
  WS: { match: / +/, lineBreaks: true },
  L_SQ_BRACKET: { match: /\[/ },
  R_SQ_BRACKET: { match: /\]/ },
  COMMENT_LINE: COMMENT_LINE_REGEXP,
}

const commonTextRules = {
  TEXT_INSIDE_QUOTES: /\"[^"]*\"/,
  VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
}

let lexer = moo.states({
  main: {
    ...commonTopRules,
    L_BRACKET: { match: /\{/ },
    R_BRACKET: { match: /\}/ },
    COLON: /:/,
    ...configLexerMainState,
    ...commonTextRules,
  },
  configStatement: {
    ...configLexerconfigStatementState,
    ...commonTextRules,
  },
})

let yy

export function setYY(v) {
  yy = v
}
%}

start -> __ start
  | "componentDiagram" document {%
      function(d) {
        // console.log('[componentDiagram]',  JSON.stringify(d[1]))
        if (!d[1]) return
        yy.apply(d[1])
        return d[1]
      }
    %}

document -> null
  | document line {%
      function(d) {
        // console.log('[document]',  JSON.stringify(d[1]))
        return d[1]
      }
    %}

line ->
    %WS:? statement
	| %WS:? %NL {% (d) => null %}

statement ->
    UMLElement {%
      function(d) {
        // console.log('[statement]', JSON.stringify(d[0]))
        return d[0]
      }
    %}
  | paramStatement %NL
  | "title" %COLON words %NL {% (d) => ({ type:'setTitle', text: d[2].trim() }) %}
  | configOpenCloseStatement %NL
  | comment %NL

UMLElement ->
    group {%
      function(d) {
        const obj = d[0]
        if (obj) yy.addGroup(obj.name, obj)
        return obj
      }
    %}
  | component {%
      function(d) {
        const obj = d[0]
        yy.addComponent(obj.name, obj)
        return obj
      }
    %}
  | interface {%
      function(d) {
        const obj = d[0]
        yy.addInterface(obj.name, obj)
        return obj
      }
    %}
  | relationship {% id %}

# group can include UMLElement recursively
group ->
    groupType %WS:? textInsideQuote _ %L_BRACKET (_ UMLElement):* _ %R_BRACKET %NL {%
        function(d) {
          const groupType = tv(d[0][0])
          const label = d[2] || groupType
          const name = d[2] || `${groupType}_${Date.now()}`
          const children = d[5].map(l => l[1]).filter(o => o)
          children.forEach(child => child.parent = name)
          return { type: 'group', name, groupType, label, children }
        }
      %}

groupType ->
    "package"
  | "node"
  | "folder"
  | "frame"
  | "cloud"
  | "database"
  | "rectangle"
  | "component"

component ->
    "component" %WS:? %VALID_TEXT %NL {%
      function(d) {
        const name = tv(d[2])
        return { type: 'component', name,  }
      }
    %}
  | "component" %WS:? %VALID_TEXT %WS:? %L_SQ_BRACKET elementLabel:+ %R_SQ_BRACKET %NL {%
      function(d) {
        const name = tv(d[2])
        const label = d[5].join('').trim()
        return { type: 'component', name, label }
      }
    %}
  | "component" %WS:? (textInsideQuote | %VALID_TEXT) %WS:* "as" __ %VALID_TEXT %NL {%
      function(d) {
        const _l = d[2][0]
        const label = typeof _l === 'string' ? _l: tv(_l)
        const name = tv(d[6])
        return { type: 'component', name, label }
      }
    %}
  | shortComponent %NL {% id %}
  | shortComponent %WS:? "as" %WS:? %VALID_TEXT %NL {%
      function(d) {
        const comp = d[0]
        const name = tv(d[4])
        return { ...comp, name, label: comp.name }
      }
    %}

shortComponent ->
    %L_SQ_BRACKET elementLabel:+ %R_SQ_BRACKET {%
      function(d) {
        const name = d[1].join('')
        return { type: 'component', name,  }
      }
    %}

elementLabel -> (%VALID_TEXT | %NL | %WS) {% (d) => tv(d[0][0]) %}

textInsideQuote -> %TEXT_INSIDE_QUOTES {%
    function(d) {
      const v = tv(d[0]).trim()
      return v.slice(1, v.length - 1)
    }
  %}

interface ->
    interfaceStart %WS:? (textInsideQuote | %VALID_TEXT) %NL {%
      function(d) {
        const _l = d[2][0]
        const name = typeof _l === 'string' ? _l: tv(_l)
        return { type: 'interface', name, }
      }
    %}
  | interfaceStart %WS:? (textInsideQuote | %VALID_TEXT) %WS:* "as" __ %VALID_TEXT %NL {%
      function(d) {
        const _l = d[2][0]
        const label = typeof _l === 'string' ? _l: tv(_l)
        const name = tv(d[6])
        return { type: 'interface', name, label }
      }
    %}

interfaceStart -> ("interface" | "()")

relationship ->
    elementReference _ relationLine _ elementReference (__ %COLON __ words):? %NL {%
      function(d) {
        // console.log('[relationship] with message', d)
        const from = d[0]
        const to = d[4]
        let message
        if (d[5]) {
          message = d[5][3]
        }
        const line = d[2]
        const obj = { from, to, line, message }
        yy.addRelationship(obj)
        return obj
      }
    %}

words ->
    (%VALID_TEXT | %WS):+ {%
      function(d) {
        return d[0].map(o => tv(o[0])).join('').trim()
      }
    %}

elementReference ->
    shortComponent {% id %}
  | ("()" __):? %VALID_TEXT {%
    function(d) {
      const interf = { type: 'interface', name: tv(d[1]) }
      return interf
    }
  %}

relationLine ->
    "-->" {% (d) => ({ lineType: yy.LineType.SOLID_ARROW }) %}
  | "<--" {% (d) => ({ lineType: yy.LineType.SOLID_ARROW, isReversed: true }) %}
  | "..>" {% (d) => ({ lineType: yy.LineType.DOTTED_ARROW }) %}
  | "<.." {% (d) => ({ lineType: yy.LineType.DOTTED_ARROW, isReversed: true }) %}
  | "--" {% (d) => ({ lineType: yy.LineType.STRAIGHT }) %}
  | ".." {% (d) => ({ lineType: yy.LineType.DOTTED }) %}

