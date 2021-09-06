@{%
export const COLOR = /#[a-zA-Z0-9]+/
export const STYLE = /@style/
%}

color -> %COLOR {% (d) => tv(d[0]) %}

styleClause ->
    %STYLE __ stylePart {%
      function(d) {
        // console.log('[styleClause]', d[2], JSON.stringify(d[4]))
        return d[2]
      }
    %}
  | %STYLE __ "{" _ ([\n] _ stylePart):* [\n] _ "}" {%
      function(d) {
        // console.log('[styleClause]', JSON.stringify(d[4]))
        const params = []
        d[4].forEach((seg) => {
          params.push(seg[2])
        })
        return params
      }
    %}

stylePart -> [a-zA-Z0-9]:+ __ [^ \n]:+ {%
    function(d) {
      const key = d[0].map(v => tv(v)).join('')
      let value = d[2]
      if (typeof value !== 'string') value = value.map(v => tv(v)).join('')
      return { type: 'addStyle', key, value }
    }%}
