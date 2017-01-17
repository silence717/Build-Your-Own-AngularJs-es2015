/**
 * @author  https://github.com/silence717
 * @date on 2017/1/17
 * @desc [AST Compiler 采用抽象语法树，计算树中的表达式并将其编译为JavaScript函数。]
 */
import _ from 'lodash';
import AST from './ast';

export default class ASTCompiler {

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
};
