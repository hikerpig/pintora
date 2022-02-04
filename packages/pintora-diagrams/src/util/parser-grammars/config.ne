@{%
export const COLOR = /#[a-zA-Z0-9]+/
export const PARAM_DIRECTIVE = /@param/
// export const CONFIG_DIRECTIVE = /@config/

//@ts-ignore
let L_PAREN = /\(/
//@ts-ignore
let R_PAREN = /\)/

/** token value */
export function getTokenValue(token) {
  if (token && 'value' in token) return token.value
  return token
}

function handleConfigOpenCloseClause(d) {
  const text = d[2].map((v) => {
    if (v.type) return getTokenValue(v)
    return v
  }).join('')

  try {
    const v = JSON.parse(text)
    return { type: 'overrideConfig', value: v }
  } catch (error) {
    return { type: 'overrideConfig', error: error }
  }
}

%}
color -> %COLOR {% (d) => tv(d[0]) %}

paramClause ->
    %PARAM_DIRECTIVE __ paramPart {%
      function(d) {
        // console.log('[paramClause]', d[2], JSON.stringify(d[4]))
        return d[2]
      }
    %}
  | %PARAM_DIRECTIVE __ "{" _ ([\n] _ paramPart):* [\n] _ "}" {%
      function(d) {
        // console.log('[paramClause]', JSON.stringify(d[4]))
        const params = []
        d[4].forEach((seg) => {
          params.push(seg[2])
        })
        return params
      }
    %}

paramPart -> [a-zA-Z0-9]:+ __ [^ \n]:+ {%
    function(d) {
      const key = d[0].map(v => tv(v)).join('')
      let value = d[2]
      if (typeof value !== 'string') value = value.map(v => tv(v)).join('')
      return { type: 'addParam', key, value }
    }%}

configClause ->
    %CONFIG_DIRECTIVE "(" [^\)]:+ ")" {%
      function(d) {
        // console.log('[configClause]', JSON.stringify(d[2]))
        const text = d[2].map((v) => {
          if (v.type) return getTokenValue(v)
          return v
        }).join('')

        try {
          const v = JSON.parse(text)
          return { type: 'overrideConfig', value: v }
        } catch (error) {
          return { type: 'overrideConfig', error: error }
        }
      }
    %}

configOpenCloseClause ->
    %CONFIG_DIRECTIVE %L_PAREN [^\)]:+ %R_PAREN {% handleConfigOpenCloseClause %}
