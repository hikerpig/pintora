@lexer lexer

@{%
// @ts-ignore
const BIND_CLASS = /@bindClass/;
%}

bindClassStatement ->
    %BIND_CLASS %WS:+ nodeList %WS:+ %VALID_TEXT %WS:* %NL {%
      (d) => ({
        type: 'bindClass',
        nodes: d[2],
        className: tv(d[4])
      })
    %}

nodeList ->
    %VALID_TEXT {% (d) => [tv(d[0])] %}
  | nodeList %COMMA %WS:* %VALID_TEXT {%
      (d) => {
        const list = d[0]
        list.push(tv(d[3]))
        return list
      }
    %}
