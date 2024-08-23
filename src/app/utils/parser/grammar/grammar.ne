@{%
    import { lexer } from './lexer';
%}
@lexer lexer

# Top-level rule
main -> (category | rule | %newline):+

# Category definition
category -> 
    %category
    _ %identifier _
    %delimiter _
    memberList
    %newline
    %comment:? %newline:?

# Rule definition
rule -> 
    %rule
    _ template _
    (transformRule | cascadeRule)
    %newline
    %comment:? %newline:?

transformRule ->
    %transform _
    ruleBody

cascadeRule ->
    %cascade _
    cascadeBody

# Anonymous category
anonymous ->
    %anonymous
    _ memberList _
    %endAnonymous

# Member list (for categories)
memberList -> %member (_ %member):*

ruleBody -> 
    template _
    context:?

# Context definition
context ->
    (%context | %exclude) _
    contextBody

# Context body
contextBody -> 
    template:? %gap template:?
    (_ %union _ contextBody):?

# Template string
template ->
    ((templateElement | anonymous) _):+

templateElement ->
    %literal
    | operator
    | %whitespace

operator -> 
    %wildcard 
    | %oneOrMore 
    | %zeroOrMore 
    | %zeroOrOne 
    | %null 
    | %space 
    | %wordEdge

# Cascade body
cascadeBody -> %indent ruleBody %comment:?

# Mandatory whitespace
__ -> %whitespace:+

# Optional whitespace
_ -> %whitespace:*
