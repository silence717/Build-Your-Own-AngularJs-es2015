/**
 * @author  https://github.com/silence717
 * @date on 2017/1/4
 */
export default class parse {

	constructor(expr) {
		const lexer = new Lexer();
		const parser = new Parser(lexer);
		return parser.parse(expr);
	}
}

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
class AST {

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
 * ASTCompiler  start
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
 * ASTCompiler  end
 */
