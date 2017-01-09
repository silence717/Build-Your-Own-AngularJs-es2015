/**
 * @author  https://github.com/silence717
 * @date on 2017/1/4
 */
import _ from 'lodash';

var ESCAPES = {'n': '\n', 'f': '\f', 'r': '\r', 't': '\t', 'v': '\v', '\'': '\'', '"': '"'};

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
		// 循环读取每个输入字符
		while (this.index < this.text.length) {
			this.ch = this.text.charAt(this.index);
			// 当前字符是一个数字，或者当前字符为.,下一个字符是数字，这兼容整数和浮点数两种
			if (this.isNumber(this.ch) || (this.ch === '.' && this.isNumber(this.peek()))) {
				this.readNumber();
			} else if (this.ch === '\'' || this.ch === '"') {
				// 传入开始的引号，判断字符串结束和开始引号是否相同
				this.readString(this.ch);
			} else if (this.isIdent(this.ch)) {
				this.readIdent();
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
				// 下一个字符
				const nextCh = this.peek();
				// 上一个字符
				const prevCh = number.charAt(number.length - 1);
				// 兼容科学计数法
				// 如果当前字符为e,下一个字符为运算符
				if (ch === 'e' && this.isExpOperator(nextCh)) {
					number += ch;
				} else if (this.isExpOperator(ch) && prevCh === 'e' && nextCh && this.isNumber(nextCh)) {
					// 当前为运算符，前一个字符为e,下一个字符存在且是一个数字
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
	 * 读取字符串
	 * @param quote 传入引号
	 */
	readString(quote) {
		this.index++;
		let string = '';
		// 转义标识
		let escape = false;
		while (this.index < this.text.length) {
			const ch = this.text.charAt(this.index);
			if (escape) {
				// 如果为unicode编码
				if (ch === 'u') {
					const hex = this.text.substring(this.index + 1, this.index + 5);
					if (!hex.match(/[\da-f]{4}/i)) {
						throw 'Invalid unicode escape';
					}
					this.index += 4;
					string += String.fromCharCode(parseInt(hex, 16));
				} else {
					// 如果是字符字符，从常量 ESCAPES 中获取可以替换的值
					const replacement = ESCAPES[ch];
					if (replacement) {
						string += replacement;
					} else {
						string += ch;
					}
				}
				escape = false;
			} else if (ch === quote) {
				this.index++;
				this.tokens.push({
					text: string,
					value: string
				});
				return;
			} else if (ch === '\\') {
				escape = true;
			} else {
				string += ch;
			}
			this.index++;
		}
		throw 'Unmatched quote';
	}

	/**
	 * 读取标识符
	 */
	readIdent() {
		let text = '';
		while (this.index < this.text.length) {
			const ch = this.text.charAt(this.index);
			if (this.isIdent(ch) || this.isNumber(ch)) {
				text += ch;
			} else {
				break;
			}
			this.index++;
		}
		const token = {text: text};
		this.tokens.push(token);
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
	/**
	 * 是否标识符
	 * @param ch
	 */
	isIdent(ch) {
		return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_' || ch === '$';
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
		// 定义一些特殊常量
		this.constants = {
			'null': {type: AST.Literal, value: null},
			'true': {type: AST.Literal, value: true},
			'false': {type: AST.Literal, value: false}
		};
	}
	ast(text) {
		this.tokens = this.lexer.lex(text);
		return this.program();
	}
	program() {
		return {type: AST.Program, body: this.primary()};
	}
	primary() {
		if (this.constants.hasOwnProperty(this.tokens[0].text)) {
			return this.constants[this.tokens[0].text];
		} else {
			return this.constant();
		}
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
		this.stringEscapeRegex = /[^ a-zA-Z0-9]/g;
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
				return this.escape(ast.value);
		}
	}

	/**
	 * 为字符串添加引号，转义
	 * @param value
	 * @returns {*}
	 */
	escape(value) {
		if (_.isString(value)) {
			return '\'' + value.replace(this.stringEscapeRegex, this.stringEscapeFn) + '\'';
		} else if (_.isNull(value)) {
			return 'null';
		} else {
			return value;
		}
	}

	/**
	 * 转义unicode字符
	 * @param c
	 * @returns {string}
	 */
	stringEscapeFn(c) {
		return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
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
