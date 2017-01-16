/**
 * @author  https://github.com/silence717
 * @date on 2017/1/4
 */
import _ from 'lodash';

const ESCAPES = {'n': '\n', 'f': '\f', 'r': '\r', 't': '\t', 'v': '\v', '\'': '\'', '"': '"'};

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
			if (this.isNumber(this.ch) || (this.is('.') && this.isNumber(this.peek()))) {
				this.readNumber();
			} else if (this.is('\'"')) {
				// 传入开始的引号，判断字符串结束和开始引号是否相同
				this.readString(this.ch);
			} else if (this.is('[],{}:.()')) {
				this.tokens.push({
					text: this.ch
				});
				this.index++;
			} else if (this.isIdent(this.ch)) {
				this.readIdent();
			} else if (this.isWhitespace(this.ch)) {
				this.index++;
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
			// 是否需要转义
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
				// 是否为引号
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
		const token = {
			text: text,
			identifier: true
		};
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

	/**
	 * 是否为空白符
	 * @param ch
	 */
	isWhitespace(ch) {
		return ch === ' ' || ch === '\r' || ch === '\t' || ch === '\n' || ch === '\v' || ch === '\u00A0';
	}

	/**
	 * 检查是否包含当前字符
	 * @param chs
	 * @returns {boolean}
	 */
	is(chs) {
		return chs.indexOf(this.ch) >= 0;
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
			'null': { type: AST.Literal, value: null },
			'true': { type: AST.Literal, value: true },
			'false': { type: AST.Literal, value: false },
			'this': { type: AST.ThisExpression },
			'$locals': { type: AST.LocalsExpression }
		};
	}
	ast(text) {
		this.tokens = this.lexer.lex(text);
		return this.program();
	}
	program() {
		return {type: AST.Program, body: this.primary()};
	}

	/**
	 * 构建节点树
	 * @returns {*}
	 */
	primary() {
		let primary;
		if (this.expect('[')) {
			primary = this.arrayDeclaration();
		} else if (this.expect('{')) {
			primary = this.object();
		} else if (this.constants.hasOwnProperty(this.tokens[0].text)) {
			primary = this.constants[this.consume().text];
		} else if (this.peek().identifier) {
			primary = this.identifier();
		} else {
			primary = this.constant();
		}
		let next;
		while ((next = this.expect('.', '[', '('))) {
			if (next.text === '[') {
				primary = {
					type: AST.MemberExpression,
					object: primary,
					property: this.primary(),
					computed: true
				};
				this.consume(']');
			} else if (next.text === '.') {
				primary = {
					type: AST.MemberExpression,
					object: primary,
					property: this.identifier(),
					computed: false
				};
			} else if (next.text === '(') {
				primary = {
					type: AST.CallExpression,
					callee: primary,
					arguments: this.parseArguments()
				};
				this.consume(')');
			}
		}
		return primary;
	}

	constant() {
		return {type: AST.Literal, value: this.consume().value};
	}

	/**
	 * 移除开始中括号
	 * 判断当前下一个token是不是我们期望的，如果是从this.tokens删除并返回
	 * @param e  期望的字符
	 * @returns {T|*}
	 */
	expect(e1, e2, e3, e4) {
		const token = this.peek(e1, e2, e3, e4);
		if (token) {
			return this.tokens.shift();
		}
	}

	/**
	 * 查找元素
	 * @param e
	 */
	peek(e1, e2, e3, e4) {
		if (this.tokens.length > 0) {
			const text = this.tokens[0].text;
			if (text === e1 || text === e2 || text === e3 || text === e4 || (!e1 && !e2 && !e3 && !e4)) {
				return this.tokens[0];
			}
		}
	}

	/**
	 * 声明数组
	 */
	arrayDeclaration() {
		const elements = [];
		if (!this.peek(']')) {
			do {
				if (this.peek(']')) {
					break;
				}
				elements.push(this.primary());
			} while (this.expect(','));
		}
		this.consume(']');
		return { type: AST.ArrayExpression, elements: elements };
	}

	/**
	 * 构建对象
	 * @returns {{type: string}}
	 */
	object() {
		const properties = [];
		if (!this.peek('}')) {
			do {
				const property = { type: AST.Property };
				if (this.peek().identifier) {
					property.key = this.identifier();
				} else {
					property.key = this.constant();
				}
				this.consume(':');
				property.value = this.primary();
				properties.push(property);
			} while (this.expect(','));
		}
		this.constant('}');
		return { type: AST.ObjectExpression, properties: properties };
	}

	/**
	 * 移除闭合中括号
	 * @param e
	 */
	consume(e) {
		const token = this.expect(e);
		if (!token) {
			throw 'Unexpected. Expecting: ' + e;
		}
		return token;
	}
	/**
	* 标识符类型
	*/
	identifier() {
		return {type: AST.Identifier, name: this.consume().text};
	}

	/**
	 *
	 * @returns {Array}
	 */
	parseArguments() {
		const args = [];
		if (!this.peek(')')) {
			do {
				args.push(this.primary());
			} while (this.expect(','));
		}
		return args;
	}

}
AST.Program = 'Program';
// 常量类型
AST.Literal = 'Literal';
// 数组类型
AST.ArrayExpression = 'ArrayExpression';
// 对象类型
AST.ObjectExpression = 'ObjectExpression';
// 属性类型
AST.Property = 'Property';
// 标识符
AST.Identifier = 'Identifier';
// this表达式
AST.ThisExpression = 'ThisExpression';
AST.LocalsExpression = 'LocalsExpression';
AST.MemberExpression = 'MemberExpression';
AST.CallExpression = 'CallExpression';

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

	/**
	 * 编译为javaScript表达式
	 * @param text
	 * @returns {*}
	 */
	compile(text) {
		const ast = this.astBuilder.ast(text);
		this.state = {body: [], nextId: 0, vars: []};
		this.recurse(ast);
		return new Function('s', 'l', (this.state.vars.length ? 'var ' + this.state.vars.join(',') + ';' : '') + this.state.body.join(''));
	}

	/**
	 * 判断类型处理
	 * @param ast
	 * @returns {*}
	 */
	recurse(ast) {
		let intoId;
		switch (ast.type) {
			case AST.Program:
				this.state.body.push('return ', this.recurse(ast.body), ';');
				break;
			case AST.Literal:
				return this.escape(ast.value);
			case AST.ArrayExpression:
				const elements = _.map(ast.elements, _.bind(element => {
					return this.recurse(element);
				}, this));
				return '[' + elements.join(',') + ']';
			case AST.ObjectExpression:
				const properties = _.map(ast.properties, _.bind(property => {
					const key = property.key.type === AST.Identifier ? property.key.name : this.escape(property.key.value);
					const value = this.recurse(property.value);
					return key + ':' + value;
				}, this));
				return '{' + properties.join(',') + '}';
			case AST.Identifier:
				intoId = this.nextId();
				this.if_(this.getHasOwnProperty('l', ast.name), this.assign(intoId, this.nonComputedMember('l', ast.name)));
				this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s', this.assign(intoId, this.nonComputedMember('s', ast.name)));
				return intoId;
			case AST.ThisExpression:
				return 's';
			case AST.MemberExpression:
				intoId = this.nextId();
				const left = this.recurse(ast.object);
				if (ast.computed) {
					const right = this.recurse(ast.property);
					this.if_(left, this.assign(intoId, this.computedMember(left, right)));
				} else {
					this.if_(left, this.assign(intoId, this.nonComputedMember(left, ast.property.name)));
				}
				return intoId;
			case AST.LocalsExpression:
				return 'l';
			case AST.CallExpression:
				const callee = this.recurse(ast.callee);
				const args = _.map(ast.arguments, _.bind(arg => {
					return this.recurse(arg);
				}, this));
				return callee + '&&' + callee + '(' + args.join(',') + ')';
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

	/**
	 * 非计算获取成员
	 * @param left 查找的对象
	 * @param right 被查找的属性
	 * @returns {string}
	 */
	nonComputedMember(left, right) {
		return '(' + left + ').' + right;
	}

	/**
	 * 生成一个JavaScript语句
	 * @param test
	 * @param consequent
	 * @private
	 */
	if_(test, consequent) {
		this.state.body.push('if(', test, '){', consequent, '}');
	}

	/**
	 * 变量赋值
	 * @param id
	 * @param value
	 */
	assign(id, value) {
		return id + '=' + value + ';';
	}

	/**
	 * 生成一个变量名称呢过，并且count自增
	 * @returns {string}
	 */
	nextId() {
		const id = 'v' + (this.state.nextId++);
		this.state.vars.push(id);
		return id;
	}

	/**
	 * 对表达式取反
	 * @param e
	 * @returns {string}
	 */
	not(e) {
		return '!(' + e + ')';
	}

	/**
	 * 获取属性
	 * @param object
	 * @param property
	 */
	getHasOwnProperty(object, property) {
		return object + '&&(' + this.escape(property) + ' in ' + object + ')';
	}

	/**
	 * 生成JavaScript computed属性访问
	 * @param left
	 * @param right
	 * @returns {string}
	 */
	computedMember(left, right) {
		return '(' + left + ')[' + right + ']';
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
