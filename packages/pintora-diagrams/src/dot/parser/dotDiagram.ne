# https://graphviz.org/doc/info/lang.html
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
} from '../../util/parser-shared'
import type { Action, ParserDOTGraph, Attr, ParserEntityStmt, NodeId, Subgraph } from '../db'

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
    DOT_DIAGRAM: /dotDiagram/,
    L_PAREN: L_PAREN_REGEXP,
    R_PAREN: R_PAREN_REGEXP,
    L_BRACKET: { match: /\{/ },
    R_BRACKET: { match: /\}/ },
    L_SQ_BRACKET: { match: /\[/ },
    R_SQ_BRACKET: { match: /\]/ },
    EQ: { match: /=/ },
    SUBGRAPH: { match: /subgraph/ },
    START_NOTE: textToCaseInsensitiveRegex('@note'),
    END_NOTE: textToCaseInsensitiveRegex('@end_note'),
    COMMENT_LINE: COMMENT_LINE_REGEXP,
    DOT_SLASH_COMMENT: /\/\/.*/,
    DOT_BLOCK_COMMENT_START: { match: /\/\*/, push: 'blockComment' },
    ...configLexerMainState,
    VALID_TEXT: { match: VALID_TEXT_REGEXP, fallback: true },
  },
  configStatement: {
    ...configLexerconfigStatementState,
    ...COMMON_TOKEN_RULES,
  },
  blockComment: {
    DOT_BLOCK_COMMENT_END: { match: /\*\//, pop: 1 },
    ANY_COMMENT_TEXT: { match: /(?:\s\w\d\n\r)+(?!\*\/)/, fallback: true },
  }
})

function rNull() {
  return null
}
%}

start -> __ start {% (d) => d[1] %}
	| %DOT_DIAGRAM document {%
      function(d) {
        return d[1]
      }
    %}

document -> null
  | document statementWrap {%
    (d) => {
        // console.log('[doc line]', d[1])
        let r = d[0]
        if (d[1]) {
          r = d[0].concat(d[1])
        }
        return r
      }
    %}

statementWrap ->
	  %WS:* statement {% (d) => {
      // console.log('[line]', JSON.stringify(d[1], null, 2))
      return d[1]
    } %}
	| %WS:? dotCommentSegment %NL {% null %}
	| %WS:? %NL {% null %}

statement ->
    # as 'graph' rule in DOT spec
    ("graph" | "digraph") %VALID_TEXT:? %L_BRACKET %NL:? stmtList %R_BRACKET {%
      function(d) {
        const children = d[4]
        const id = d[1] ? tv(d[1]): ''
        const action: Action = {
          type: 'addGraph',
          graph: {
            type: tv(d[0][0]),
            id,
            children,
          } as ParserDOTGraph
        }
        return action
      }
    %}
  | paramStatement %NL
  | configOpenCloseStatement %NL
  | comment %NL

dotCommentSegment ->
    %DOT_SLASH_COMMENT {% rNull %}
  | %DOT_BLOCK_COMMENT_START %ANY_COMMENT_TEXT:* %DOT_BLOCK_COMMENT_END {% rNull %}

# as 'stmt_list' rule in DOT spec
stmtList ->
    dotStmt (%SEMICOLON | %NL) _ stmtList:? {%
      function(d) {
        const stmtList = d[3] || []
        const stmt = d[0][0]
        if (!stmt) return stmtList
        return [stmt, ...stmtList]
      }
    %}

# as 'stmt' rule in DOT spec
dotStmt ->
    attrStmt
  | nodeStmt
  | edgeStmt
  | singleAttrStmt
  | subgraph
  | dotCommentSegment {% null %}
  | comment {% null %}

# as 'attr_stmt' rule in DOT spec
attrStmt ->
    ("graph" | "node" | "edge") __ attrList {%
      function(d) {
        const target = tv(d[0][0])
        const attr_list = d[2]
        return {
          type: 'attr_stmt',
          target,
          attr_list,
        } as ParserEntityStmt
      }
    %}

singleAttrStmt ->
    %VALID_TEXT %EQ (%VALID_TEXT | %QUOTED_WORD) (%SEMICOLON | %COMMA):? {%
      function(d) {
        const id = tv(d[0])
        const eqValToken = d[2][0]
        const eq = eqValToken.type === 'QUOTED_WORD' ? getQuotedWord(eqValToken): tv(eqValToken)
        const attr: Attr = {
          type: 'attr',
          id,
          eq,
        }
        return attr
      }
    %}

nodeStmt ->
    nodeId attrList:? {%
      function(d) {
        const nodeStmt: ParserEntityStmt = {
          type: 'node_stmt',
          nodeId: d[0],
        }
        if (d[1]) {
          nodeStmt.attr_list = d[1]
        }
        return nodeStmt
      }
    %}
  | nodeId %L_SQ_BRACKET %QUOTED_WORD %R_SQ_BRACKET {%
      function(d) {
        const nodeId = d[0]
        const label = getQuotedWord(d[2])
        return {
          type: 'node_stmt',
          nodeId: d[0],
          attrs: {
            label,
          }
        }
      }
    %}
  | nodeId {%
      function(d) {
        const nodeId = d[0]
        return {
          type: 'node_stmt',
          nodeId: d[0],
        }
      }
    %}

# as 'edge_stmt' rule in DOT spec
edgeStmt ->
    (nodeId) edgeRHS attrList:? {%
      function(d) {
        const startNode = d[0][0]
        const edge_list = [startNode, ...d[1]]
        const edgeStmt: ParserEntityStmt = {
          type: 'edge_stmt',
          edge_list,
        }
        if (d[2]) {
          edgeStmt.attr_list = d[2]
        }
        return edgeStmt
      }
    %}

edgeRHS ->
    edgeop %WS:? (nodeId) edgeRHS:? {%
      function(d) {
        const edgeList = d[3] || []
        const edge = d[2][0]
        return [edge, ...edgeList]
      }
    %}

edgeop -> "->"
  | "--"

attrList ->
    %L_SQ_BRACKET attrItems %R_SQ_BRACKET attrList:? {%
      function(d) {
        const attrList = d[3] ? d[3][0]: []
        const attrItems = d[1]
        return d[1]
      }
    %}

# as 'a_list' rule in DOT spec
attrItems ->
    %VALID_TEXT %EQ (%VALID_TEXT | %QUOTED_WORD) (%SEMICOLON | %COMMA):? attrItems:? {%
      function(d) {
        const attrItems = d[4] ? d[4]: []
        const id = tv(d[0])
        const eqValToken = d[2][0]
        const eq = eqValToken.type === 'QUOTED_WORD' ? getQuotedWord(eqValToken): tv(eqValToken)
        const attr: Attr = {
          type: 'attr',
          id,
          eq,
        }

        return [attr, ...attrItems]
      }
    %}

nodeId ->
    %VALID_TEXT {%
      function(d) {
        return {
          type: 'node_id',
          id: tv(d[0]).trim()
        } as NodeId
      }
    %}
  | %QUOTED_WORD {%
      function(d) {
        return {
          type: 'node_id',
          id: getQuotedWord(d[0]).trim()
        } as NodeId
      }
    %}

# as 'subgraph' rule in DOT spec
subgraph ->
    %SUBGRAPH %VALID_TEXT:? %L_BRACKET _ stmtList _ %R_BRACKET {%
      function(d) {
        const children = d[4]
        const subgraph: Subgraph = {
          type: 'subgraph',
          children,
        }
        if (d[1]) {
          subgraph.id = tv(d[1]).trim()
        }
        return subgraph
      }
    %}
