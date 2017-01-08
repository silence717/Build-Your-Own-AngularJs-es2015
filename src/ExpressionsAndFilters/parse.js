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
		this.text = text;
		this.index = 0;
		this.ch = undefined;
		this.tokens = [];
		while (this.index < this.text.length) {
			this.ch = this.text.charAt(this.index);
			if (this.isNumber(this.ch) || (this.ch === '.' && this.isNumber(this.peek()))) {
				this.readNumber();
			} else {
				throw 'Unexpected next character: ' + this.ch;
			}
		}
		return this.tokens;
	}

	/**
	 * 判断是否为数字
	 * @param ch
	 */
	isNumber(ch) {
		return ch >= '0' && ch <= '9';
	}

	/**
	 * 读取数字
	 */
	readNumber() {
		let number = '';
		while (this.index < this.text.length) {
			// 为了兼容科学计数法的字符 e 大小写问题，全部转为小写
			let ch = this.text.charAt(this.index).toLowerCase();
			if (ch === '.' || this.isNumber(ch)) {
				number += ch;
			} else {
				const nextCh = this.peek();
				const prevCh = number.charAt(number.length - 1);
				if (ch === 'e' && this.isExpOperator(nextCh)) {
					number += ch;
				} else if (this.isExpOperator(ch) && prevCh === 'e' && nextCh && this.isNumber(nextCh)) {
					number += ch;
				} else if (this.isExpOperator(ch) && prevCh === 'e' && (!nextCh || !this.isNumber(nextCh))) {
					throw 'Invalid exponent';
				} else {
					break;
				}
			}
			this.index++;
		}
		this.tokens.push({
			text: number,
			value: Number(number)
		});
	}

	/**
	 *返回下一个字符的文本，而不向前移动当前的索引。如果没有下一个字符，`peek`会返回`false`
	 * @returns {*}
	 */
	peek() {
		return this.index < this.text.length - 1 ? this.text.charAt(this.index + 1) : false;
	}

	/**
	 * 判断当前字符是否为运算符
	 * @param ch
	 * @returns {boolean|*}
	 */
	isExpOperator(ch) {
		return ch === '-' || ch === '+' || this.isNumber(ch);
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
		return this.program();
	}
	program() {
		return {type: AST.Program, body: this.constant()};
	}
	constant() {
		return {type: AST.Literal, value: this.tokens[0].value};
	}
}
AST.Program = 'Program';
AST.Literal = 'Literal';

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
		this.state = {body: []};
		this.recurse(ast);
		return new Function(this.state.body.join(''));
	}
	recurse(ast) {
		switch (ast.type) {
			case AST.Program:
				this.state.body.push('return ', this.recurse(ast.body), ';');
				break;
			case AST.Literal:
				return ast.value;
		}
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
