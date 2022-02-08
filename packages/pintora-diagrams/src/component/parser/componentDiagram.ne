@preprocessor typescript
@lexer lexer
@builtin "whitespace.ne"
@include "../../util/parser-grammars/config.ne"
@include "../../util/parser-grammars/comment.ne"

@{%
import * as moo from '@hikerpig/moo'
import {
  tv,
  VALID_TEXT_REGEXP,
  COMMENT_LINE_REGEXP,
  CONFIG_DIRECTIVE,
  configLexerMainState,
  configLexerConfigClauseState,
} from '../../util/parser-shared'

const commonTopRules = {
  NL: { match: /\n/, lineBreaks: true },
  WS: { match: /\s+/, lineBreaks: true },
  L_SQ_BRACKET: { match: /\[/ },
  R_SQ_BRACKET: { match: /\]/ },
  COMMENT_LINE: COMMENT_LINE_REGEXP,
}

const commonTextRules = {
  TEXT_INSIDE_QUOTES: /\"[^"]*\"/,
  WORD: { match: VALID_TEXT_REGEXP, fallback: true },
}

let lexer = moo.states({
  main: {
    ...commonTopRules,
    L_BRACKET: { match: /\{/ },
    R_BRACKET: { match: /\}/ },
    ...configLexerMainState,
    ...commonTextRules,
  },
  configClause: {
    ...configLexerConfigClauseState,
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
    %WS:* statement
	| %NL {% (d) => null %}

statement ->
    UMLElement {%
      function(d) {
        // console.log('[statement]', JSON.stringify(d[0]))
        return d[0]
      }
    %}
  | paramClause _ %NL
  | configOpenCloseClause _ %NL
  | comment _ %NL

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
    groupType __ textInsideQuote __ %L_BRACKET __ (__ UMLElement _):* %R_BRACKET _ %NL {%
        function(d) {
          const groupType = tv(d[0][0])
          const label = d[2] || groupType
          const name = d[2] || `${groupType}_${Date.now()}`
          const children = d[6].map(l => l[1]).filter(o => o)
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
    "component" __ %WORD %WS:* %NL {%
      function(d) {
        const name = tv(d[2])
        return { type: 'component', name,  }
      }
    %}
  | "component" __ %WORD __ %L_SQ_BRACKET elementLabel:+ %R_SQ_BRACKET %WS:? %NL {%
      function(d) {
        const name = tv(d[2])
        const label = d[5].join('').trim()
        return { type: 'component', name, label }
      }
    %}
  # | "component" __ textInsideQuote _ %L_BRACKET _ (__ UMLElement _):* %R_BRACKET {%
  #     function(d) {
  #       const name = d[2]
  #       const children = d[6].map(l => l[1]).filter(o => o)
  #       return { type: 'component', isGroup: true, name, children }
  #     }
  #   %}
  | shortComponent %WS:? %NL {% id %}
  | shortComponent __ "as" __ %WORD %WS:* %NL {%
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

elementLabel -> %WORD {% (d) => tv(d[0]) %}
  | %WS {% (d) => tv(d[0]) %}
  | %NL {% (d) => tv(d[0]) %}

textInsideQuote -> %TEXT_INSIDE_QUOTES {%
    function(d) {
      const v = tv(d[0]).trim()
      return v.slice(1, v.length - 1)
    }
  %}

interface ->
    ("interface" | "()") __ (textInsideQuote | %WORD) %WS:* %NL {%
      function(d) {
        const _l = d[2][0]
        const name = typeof _l === 'string' ? _l: tv(_l)
        return { type: 'interface', name, }
      }
    %}
  | ("interface" | "()") __ (textInsideQuote | %WORD) %WS:* "as" __ %WORD %WS:* %NL {%
      function(d) {
        const _l = d[2][0]
        const label = typeof _l === 'string' ? _l: tv(_l)
        const name = tv(d[6])
        return { type: 'interface', name, label }
      }
    %}

relationship ->
    elementReference _ relationLine _ elementReference (__ ":" __ (%WORD | %WS):+):? %NL {%
      function(d) {
        // console.log('[relationship] with message', d)
        const from = d[0]
        const to = d[4]
        let message
        if (d[5]) {
          message = d[5][3].map(a => a[0]).map(o => tv(o)).join('')
        }
        const line = d[2]
        const obj = { from, to, line, message }
        yy.addRelationship(obj)
        return obj
      }
    %}

elementReference ->
    shortComponent {% id %}
  | ("()" __):? %WORD {%
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

