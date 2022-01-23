@{%
export const COLOR = /#[a-zA-Z0-9]+/
export const CONFIG_DIRECTIVE = /@config/
%}

color -> %COLOR {% (d) => tv(d[0]) %}

configClause ->
    %CONFIG_DIRECTIVE __ configPart {%
      function(d) {
        // console.log('[configClause]', d[2], JSON.stringify(d[4]))
        return d[2]
      }
    %}
  | %CONFIG_DIRECTIVE __ "{" _ ([\n] _ configPart):* [\n] _ "}" {%
      function(d) {
        // console.log('[configClause]', JSON.stringify(d[4]))
        const params = []
        d[4].forEach((seg) => {
          params.push(seg[2])
        })
        return params
      }
    %}

configPart -> [a-zA-Z0-9]:+ __ [^ \n]:+ {%
    function(d) {
      const key = d[0].map(v => tv(v)).join('')
      let value = d[2]
      if (typeof value !== 'string') value = value.map(v => tv(v)).join('')
      return { type: 'addConfig', key, value }
    }%}
