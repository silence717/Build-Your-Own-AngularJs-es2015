/**
 * @author  https://github.com/silence717
 * @date on 2017/1/17
 * @desc [AST Builder 接收此法分析器生成的标记数组，并从中构建抽象语法树]
 */
export default class AST {

	constructor(lexer) {
		// lexer解析出来的tokens
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
		return {type: AST.Program, body: this.assignment()};
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
				elements.push(this.assignment());
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
				property.value = this.assignment();
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
				args.push(this.assignment());
			} while (this.expect(','));
		}
		return args;
	}

	/**
	 * 赋值
	 * @returns {*}
	 */
	assignment() {
		const left = this.multiplicative();
		if (this.expect('=')) {
			const right = this.multiplicative();
			return {type: AST.AssignmentExpression, left: left, right: right};
		}
		return left;
	}

	/**
	 * 处理一元运算符
	 * @returns {*}
	 */
	unary() {
		let token;
		if ((token = this.expect('+', '!', '-'))) {
			return {
				type: AST.UnaryExpression,
				operator: token.text,
				argument: this.unary()
			};
		} else {
			return this.primary();
		}
	};
	/**
	 * [multiplicative 处理多元操作符]
	 * @return {[type]} [description]
	 */
	multiplicative() {
		let left = this.unary();
		let token;
		while ((token = this.expect('*', '/', '%'))) {
			left = {
				type: AST.BinaryExpression,
				left: left,
				operator: token.text,
				right: this.unary()
			};
		}
		return left;
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
// 成员表达式
AST.MemberExpression = 'MemberExpression';
AST.CallExpression = 'CallExpression';
// 赋值表达式
AST.AssignmentExpression = 'AssignmentExpression';
// 一元表达式
AST.UnaryExpression = 'UnaryExpression';
AST.BinaryExpression = 'BinaryExpression';
