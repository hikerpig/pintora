@{%
export const COMMENT_LINE = /%%.*/
%}

comment -> %COMMENT_LINE {% (d) => null %}
