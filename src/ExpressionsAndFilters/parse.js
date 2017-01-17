/**
 * @author  https://github.com/silence717
 * @date on 2017/1/4
 */
import ASTCompiler from './astCompiler';
import AST from './ast';
import Lexer from './lexer';

class Parser {

	constructor(lexer) {
		this.lexer = lexer;
		this.ast = new AST(this.lexer);
		this.astCompile = new ASTCompiler(this.ast);
	}
	parse(text) {
		return this.astCompile.compile(text);
	}
}

function parse(expr) {
	const lexer = new Lexer();
	const parser = new Parser(lexer);
	return parser.parse(expr);
}
module.exports = parse;
