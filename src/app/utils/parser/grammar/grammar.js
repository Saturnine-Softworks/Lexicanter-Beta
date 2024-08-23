// Generated automatically by nearley, version 2.20.1
// http://github.com/Hardmath123/nearley
import { lexer } from './lexer';
(function () {
function id(x) { return x[0]; }

var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["category"]},
    {"name": "main$ebnf$1$subexpression$1", "symbols": ["rule"]},
    {"name": "main$ebnf$1$subexpression$1", "symbols": [(lexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1$subexpression$1"]},
    {"name": "main$ebnf$1$subexpression$2", "symbols": ["category"]},
    {"name": "main$ebnf$1$subexpression$2", "symbols": ["rule"]},
    {"name": "main$ebnf$1$subexpression$2", "symbols": [(lexer.has("newline") ? {type: "newline"} : newline)]},
    {"name": "main$ebnf$1", "symbols": ["main$ebnf$1", "main$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "main", "symbols": ["main$ebnf$1"]},
    {"name": "category$ebnf$1", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)], "postprocess": id},
    {"name": "category$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "category$ebnf$2", "symbols": [(lexer.has("newline") ? {type: "newline"} : newline)], "postprocess": id},
    {"name": "category$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "category", "symbols": [(lexer.has("category") ? {type: "category"} : category), "_", (lexer.has("identifier") ? {type: "identifier"} : identifier), "_", (lexer.has("delimiter") ? {type: "delimiter"} : delimiter), "_", "memberList", (lexer.has("newline") ? {type: "newline"} : newline), "category$ebnf$1", "category$ebnf$2"]},
    {"name": "rule$subexpression$1", "symbols": ["transformRule"]},
    {"name": "rule$subexpression$1", "symbols": ["cascadeRule"]},
    {"name": "rule$ebnf$1", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)], "postprocess": id},
    {"name": "rule$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rule$ebnf$2", "symbols": [(lexer.has("newline") ? {type: "newline"} : newline)], "postprocess": id},
    {"name": "rule$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "rule", "symbols": [(lexer.has("rule") ? {type: "rule"} : rule), "_", "template", "_", "rule$subexpression$1", (lexer.has("newline") ? {type: "newline"} : newline), "rule$ebnf$1", "rule$ebnf$2"]},
    {"name": "transformRule", "symbols": [(lexer.has("transform") ? {type: "transform"} : transform), "_", "ruleBody"]},
    {"name": "cascadeRule", "symbols": [(lexer.has("cascade") ? {type: "cascade"} : cascade), "_", "cascadeBody"]},
    {"name": "anonymous", "symbols": [(lexer.has("anonymous") ? {type: "anonymous"} : anonymous), "_", "memberList", "_", (lexer.has("endAnonymous") ? {type: "endAnonymous"} : endAnonymous)]},
    {"name": "memberList$ebnf$1", "symbols": []},
    {"name": "memberList$ebnf$1$subexpression$1", "symbols": ["_", (lexer.has("member") ? {type: "member"} : member)]},
    {"name": "memberList$ebnf$1", "symbols": ["memberList$ebnf$1", "memberList$ebnf$1$subexpression$1"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "memberList", "symbols": [(lexer.has("member") ? {type: "member"} : member), "memberList$ebnf$1"]},
    {"name": "ruleBody$ebnf$1", "symbols": ["context"], "postprocess": id},
    {"name": "ruleBody$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "ruleBody", "symbols": ["template", "_", "ruleBody$ebnf$1"]},
    {"name": "context$subexpression$1", "symbols": [(lexer.has("context") ? {type: "context"} : context)]},
    {"name": "context$subexpression$1", "symbols": [(lexer.has("exclude") ? {type: "exclude"} : exclude)]},
    {"name": "context", "symbols": ["context$subexpression$1", "_", "contextBody"]},
    {"name": "contextBody$ebnf$1", "symbols": ["template"], "postprocess": id},
    {"name": "contextBody$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "contextBody$ebnf$2", "symbols": ["template"], "postprocess": id},
    {"name": "contextBody$ebnf$2", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "contextBody$ebnf$3$subexpression$1", "symbols": ["_", (lexer.has("union") ? {type: "union"} : union), "_", "contextBody"]},
    {"name": "contextBody$ebnf$3", "symbols": ["contextBody$ebnf$3$subexpression$1"], "postprocess": id},
    {"name": "contextBody$ebnf$3", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "contextBody", "symbols": ["contextBody$ebnf$1", (lexer.has("gap") ? {type: "gap"} : gap), "contextBody$ebnf$2", "contextBody$ebnf$3"]},
    {"name": "template$ebnf$1$subexpression$1$subexpression$1", "symbols": ["templateElement"]},
    {"name": "template$ebnf$1$subexpression$1$subexpression$1", "symbols": ["anonymous"]},
    {"name": "template$ebnf$1$subexpression$1", "symbols": ["template$ebnf$1$subexpression$1$subexpression$1", "_"]},
    {"name": "template$ebnf$1", "symbols": ["template$ebnf$1$subexpression$1"]},
    {"name": "template$ebnf$1$subexpression$2$subexpression$1", "symbols": ["templateElement"]},
    {"name": "template$ebnf$1$subexpression$2$subexpression$1", "symbols": ["anonymous"]},
    {"name": "template$ebnf$1$subexpression$2", "symbols": ["template$ebnf$1$subexpression$2$subexpression$1", "_"]},
    {"name": "template$ebnf$1", "symbols": ["template$ebnf$1", "template$ebnf$1$subexpression$2"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "template", "symbols": ["template$ebnf$1"]},
    {"name": "templateElement", "symbols": [(lexer.has("literal") ? {type: "literal"} : literal)]},
    {"name": "templateElement", "symbols": ["operator"]},
    {"name": "templateElement", "symbols": [(lexer.has("whitespace") ? {type: "whitespace"} : whitespace)]},
    {"name": "operator", "symbols": [(lexer.has("wildcard") ? {type: "wildcard"} : wildcard)]},
    {"name": "operator", "symbols": [(lexer.has("oneOrMore") ? {type: "oneOrMore"} : oneOrMore)]},
    {"name": "operator", "symbols": [(lexer.has("zeroOrMore") ? {type: "zeroOrMore"} : zeroOrMore)]},
    {"name": "operator", "symbols": [(lexer.has("zeroOrOne") ? {type: "zeroOrOne"} : zeroOrOne)]},
    {"name": "operator", "symbols": [(lexer.has("null") ? {type: "null"} : null)]},
    {"name": "operator", "symbols": [(lexer.has("space") ? {type: "space"} : space)]},
    {"name": "operator", "symbols": [(lexer.has("wordEdge") ? {type: "wordEdge"} : wordEdge)]},
    {"name": "cascadeBody$ebnf$1", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)], "postprocess": id},
    {"name": "cascadeBody$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "cascadeBody", "symbols": [(lexer.has("indent") ? {type: "indent"} : indent), "ruleBody", "cascadeBody$ebnf$1"]},
    {"name": "__$ebnf$1", "symbols": [(lexer.has("whitespace") ? {type: "whitespace"} : whitespace)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("whitespace") ? {type: "whitespace"} : whitespace)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("whitespace") ? {type: "whitespace"} : whitespace)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"]}
]
  , ParserStart: "main"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
