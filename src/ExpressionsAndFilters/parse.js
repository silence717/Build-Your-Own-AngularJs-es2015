/**
 * @author  https://github.com/silence717
 * @date on 2017/1/4
 */

function parse(expr) {
	const lexer = new Lexer();
	const parser = new Parser(lexer);
	return parser.parse(expr);
}
module.exports = parse;

/**
 * Lexer  start
 */
class Lexer {

	constructor() {

	}
	lex(text) {

	}
}
/**
 * Lexer  end
 */

/**
 * AST  start
 */
class AST {

	constructor(lexer) {
		this.lexer = lexer;
	}
	ast(text) {
		this.tokens = this.lexer.lex(text);
	}
}
/**
 * AST  end
 */

/**
 * ASTCompiler  start
 */
class ASTCompiler {

	constructor(astBuilder) {
		this.astBuilder = astBuilder;
	}
	compile(text) {
		const ast = this.astBuilder.ast(text);
	}
}
/**
 * ASTCompiler  end
 */


/**
 * Parser  start
 */
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
/**
 * Parser  end
 */
