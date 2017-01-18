/**
 * @author  https://github.com/silence717
 * @date on 2017/1/17
 * @desc [AST Compiler 采用抽象语法树，计算树中的表达式并将其编译为JavaScript函数。]
 */
import _ from 'lodash';
import AST from './ast';
// 确保是安全的成员属性访问
function ensureSafeMemberName(name) {
	if (name === 'constructor' || name === '__proto__' ||
		name === '__defineGetter__' || name === '__defineSetter__' ||
		name === '__lookupGetter__' || name === '__lookupSetter__') {
		throw 'Attempting to access a disallowed field in Angular expressions!';
	}
}
// 确保是安全的对象
function ensureSafeObject(obj) {
	if (obj) {
		if (obj.window === obj) {
			throw 'Referencing window in Angular expressions is disallowed!';
		} else if (obj.children && (obj.nodeName || (obj.prop && obj.attr && obj.find))) {
			throw 'Referencing DOM nodes in Angular expressions is disallowed!';
		} else if (obj.constructor === obj) {
			throw 'Referencing Function in Angular expressions is disallowed!';
		} else if (obj === Object) {
			throw 'Referencing Object in Angular expressions is disallowed!';
		}
	}
	return obj;
}
const CALL = Function.prototype.call;
const APPLY = Function.prototype.apply;
const BIND = Function.prototype.bind;
// 确保函数是安全
function ensureSafeFunction(obj) {
	if (obj) {
		if (obj.constructor === obj) {
			throw 'Referencing Function in Angular expressions is disallowed!';
		} else if (obj === CALL || obj === APPLY || obj === BIND) {
			throw 'Referencing call, apply, or bind in Angular expressions is disallowed!';
		}
	}
	return obj;
}

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
		const fnString = 'var fn=function(s,l){' + (this.state.vars.length ? 'var ' + this.state.vars.join(',') + ';' : '') + this.state.body.join('') + '}; return fn;';
		return new Function('ensureSafeMemberName', 'ensureSafeObject', 'ensureSafeFunction', fnString)(ensureSafeMemberName, ensureSafeObject, ensureSafeFunction);
	}

	/**
	 * 判断类型处理
	 * @param ast
	 * @returns {*}
	 */
	recurse(ast, context, create) {
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
				ensureSafeMemberName(ast.name);
				intoId = this.nextId();
				this.if_(this.getHasOwnProperty('l', ast.name), this.assign(intoId, this.nonComputedMember('l', ast.name)));
				if (create) {
					this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s && ' + this.not(this.getHasOwnProperty('s', ast.name)), this.assign(this.nonComputedMember('s', ast.name), '{}'));
				}
				this.if_(this.not(this.getHasOwnProperty('l', ast.name)) + ' && s', this.assign(intoId, this.nonComputedMember('s', ast.name)));
				if (context) {
					context.context = this.getHasOwnProperty('l', ast.name) + '?l:s';
					context.name = ast.name;
					context.computed = false;
				}
				this.addEnsureSafeObject(intoId);
				return intoId;
			case AST.ThisExpression:
				return 's';
			case AST.MemberExpression:
				intoId = this.nextId();
				const left = this.recurse(ast.object, undefined, create);
				if (context) {
					context.context = left;
				}
				if (ast.computed) {
					const right = this.recurse(ast.property);
					this.addEnsureSafeMemberName(right);
					if (create) {
						this.if_(this.not(this.computedMember(left, right)), this.assign(this.computedMember(left, right), '{}'));
					}
					this.if_(left, this.assign(intoId, 'ensureSafeObject(' + this.computedMember(left, right) + ')'));
					if (context) {
						context.name = right;
						context.computed = true;
					}
				} else {
					ensureSafeMemberName(ast.property.name);
					if (create) {
						this.if_(this.not(this.nonComputedMember(left, ast.property.name)), this.assign(this.nonComputedMember(left, ast.property.name), '{}'));
					}
					this.if_(left, this.assign(intoId, 'ensureSafeObject(' + this.nonComputedMember(left, ast.property.name) + ')'));
					if (context) {
						context.name = ast.property.name;
						context.computed = false;
					}
				}
				return intoId;
			case AST.LocalsExpression:
				return 'l';
			case AST.CallExpression:
				const callContext = {};
				let callee = this.recurse(ast.callee, callContext);
				const args = _.map(ast.arguments, _.bind(arg => {
					return 'ensureSafeObject(' + this.recurse(arg) + ')';
				}, this));
				if (callContext.name) {
					this.addEnsureSafeObject(callContext.context);
					if (callContext.computed) {
						callee = this.computedMember(callContext.context, callContext.name);
					} else {
						callee = this.nonComputedMember(callContext.context, callContext.name);
					}
				}
				this.addEnsureSafeFunction(callee);
				return callee + '&&ensureSafeObject(' + callee + '(' + args.join(',') + '))';
			case AST.AssignmentExpression:
				const leftContext = {};
				this.recurse(ast.left, leftContext, true);
				let leftExpr;
				if (leftContext.computed) {
					leftExpr = this.computedMember(leftContext.context, leftContext.name);
				} else {
					leftExpr = this.nonComputedMember(leftContext.context, leftContext.name);
				}
				return this.assign(leftExpr, 'ensureSafeObject(' + this.recurse(ast.right) + ')');
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

	/**
	 * 添加安全的成员名称
	 * @param expr
	 */
	addEnsureSafeMemberName(expr) {
		this.state.body.push('ensureSafeMemberName(' + expr + ');');
	}

	/**
	 * 添加安全的对象
	 * @param expr
	 */
	addEnsureSafeObject(expr) {
		this.state.body.push('ensureSafeObject(' + expr + ');');
	}

	/**
	 * 添加安全函数
	 * @param expr
	 */
	addEnsureSafeFunction(expr) {
		this.state.body.push('ensureSafeFunction(' + expr + ');');
	}
};
