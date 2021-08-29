@{%
export const COLOR = /#[a-zA-Z0-9]+/
export const STYLE = /@style/
%}

color -> %COLOR {% (d) => tv(d[0]) %}

styleClause ->
    %STYLE __ [a-zA-Z0-9]:+ __ [^ \n]:+ {%
      function(d) {
        // console.log('[styleClause]', d[2], JSON.stringify(d[4]))
        const key = d[2].map(v => tv(v)).join('')
        let value = d[4]
        if (typeof value !== 'string') value = value.map(v => tv(v)).join('')
        // console.log('[styleClause] result', key, value)
        return { type: 'addStyle', key, value }
      }
    %}

