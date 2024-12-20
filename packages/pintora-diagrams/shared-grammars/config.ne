@{%
let _COLOR = /#[a-zA-Z0-9]+/
let PARAM_DIRECTIVE = /@param/
let CONFIG_DIRECTIVE = /@config/

//@ts-ignore
let L_PAREN = /\(/
//@ts-ignore
let R_PAREN = /\)/

/** token value */
export function getTokenValue(token) {
  if (token && 'value' in token) return token.value
  return token
}

function handleConfigOpenCloseStatement(d) {
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

# non-terminal, needs
# - `_COLOR` token
color -> %_COLOR {% (d) => tv(d[0]) %}

# `@param` statement, with some prerequisites:
# - `PARAM_DIRECTIVE` token
paramStatement ->
    %PARAM_DIRECTIVE __ paramPart {%
      function(d) {
        return d[2]
      }
    %}
  | %PARAM_DIRECTIVE __ "{" _ ([\n] _ paramPart):* [\n] _ "}" {%
      function(d) {
        // console.log('[paramStatement]', JSON.stringify(d[4]))
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

# `@config` statement
# - `CONFIG_DIRECTIVE` token
configStatement ->
    %CONFIG_DIRECTIVE "(" [^\)]:+ ")" {% handleConfigOpenCloseStatement %}

# `@config` statement, with some prerequisites:
# - `CONFIG_DIRECTIVE` token
# - `L_PAREN` token
# - `R_PAREN` token
configOpenCloseStatement ->
    %CONFIG_DIRECTIVE %L_PAREN [^\)]:+ %R_PAREN {% handleConfigOpenCloseStatement %}
