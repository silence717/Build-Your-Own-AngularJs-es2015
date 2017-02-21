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
// 是否被定义
function ifDefined(value, defaultValue) {
	return typeof value === 'undefined' ? defaultValue : value;
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
/**
 * 检测是一个表达式是否为literal
 * @param ast
 * @returns {boolean}
 */
function isLiteral(ast) {
	return ast.body.length === 0 ||
		ast.body.length === 1 && (
		ast.body[0].type === AST.Literal ||
		ast.body[0].type === AST.ArrayExpression ||
		ast.body[0].type === AST.ObjectExpression);
}
/**
 * 标记常量标识
 * @param ast
 */
function markConstantAndWatchExpressions(ast, $filter) {
	let allConstants;
	let argsToWatch;
	switch (ast.type) {
		case AST.Program:
			allConstants = true;
			_.forEach(ast.body, expr => {
				markConstantAndWatchExpressions(expr, $filter);
				// 当所有子节点都为constant的时候，整个Program才会为常量
				allConstants = allConstants && expr.constant;
			});
			ast.constant = allConstants;
			break;
		case AST.Literal:
			ast.constant = true;
			ast.toWatch = [];
			break;
		case AST.Identifier:
			ast.constant = false;
			ast.toWatch = [ast];
			break;
		case AST.ArrayExpression:
			allConstants = true;
			argsToWatch = [];
			_.forEach(ast.elements, element => {
				// 递归调用每个元素，只有它们都为常量的时候，数组才会是常量
				markConstantAndWatchExpressions(element, $filter);
				allConstants = allConstants && element.constant;
				if (!element.constant) {
					// 将所有非常量的元素加入到监控数组
					argsToWatch.push.apply(argsToWatch, element.toWatch);
				}
			});
			ast.constant = allConstants;
			ast.toWatch = argsToWatch;
			break;
		case AST.ObjectExpression:
			allConstants = true;
			argsToWatch = [];
			_.forEach(ast.properties, property => {
				// 遍历对象的每个属性，去标记它们的值是否为常量
				markConstantAndWatchExpressions(property.value, $filter);
				allConstants = allConstants && property.value.constant;
				if (!property.value.constant) {
					argsToWatch.push.apply(argsToWatch, property.value.toWatch);
				}
			});
			ast.constant = allConstants;
			ast.toWatch = argsToWatch;
			break;
		case AST.ThisExpression:
		case AST.LocalsExpression:
			ast.constant = false;
			ast.toWatch = [];
			break;
		case AST.MemberExpression:
			markConstantAndWatchExpressions(ast.object, $filter);
			// 如果是computed查找，需要额外考虑key值
			if (ast.computed) {
				markConstantAndWatchExpressions(ast.property, $filter);
			}
			ast.constant = ast.object.constant &&
				(!ast.computed || ast.property.constant);
			ast.toWatch = [ast];
			break;
		case AST.CallExpression:
			const stateless = ast.filter && !$filter(ast.callee.name).$stateful;
			// allConstants = stateless ? true : false;
			if (stateless) {
				allConstants = true;
			} else {
				allConstants = false;
			}
			argsToWatch = [];
			_.forEach(ast.arguments, arg => {
				markConstantAndWatchExpressions(arg, $filter);
				allConstants = allConstants && arg.constant;
				if (!arg.constant) {
					argsToWatch.push.apply(argsToWatch, arg.toWatch);
				}
			});
			ast.constant = allConstants;
			ast.toWatch = ast. lter ? argsToWatch : [ast];
			break;
		case AST.AssignmentExpression:
			markConstantAndWatchExpressions(ast.left, $filter);
			markConstantAndWatchExpressions(ast.right, $filter);
			ast.constant = ast.left.constant && ast.right.constant;
			ast.toWatch = [ast];
			break;
		case AST.UnaryExpression:
			markConstantAndWatchExpressions(ast.argument, $filter);
			ast.constant = ast.argument.constant;
			ast.toWatch = ast.argument.toWatch;
			break;
		case AST.BinaryExpression:
			markConstantAndWatchExpressions(ast.left, $filter);
			markConstantAndWatchExpressions(ast.right, $filter);
			ast.constant = ast.left.constant && ast.right.constant;
			ast.toWatch = ast.left.toWatch.concat(ast.right.toWatch);
			break;
		case AST.LogicalExpression:
			markConstantAndWatchExpressions(ast.left, $filter);
			markConstantAndWatchExpressions(ast.right, $filter);
			ast.constant = ast.left.constant && ast.right.constant;
			ast.toWatch = [ast];
			break;
		case AST.ConditionalExpression:
			markConstantAndWatchExpressions(ast.test, $filter);
			markConstantAndWatchExpressions(ast.consequent, $filter);
			markConstantAndWatchExpressions(ast.alternate, $filter);
			ast.constant = ast.test.constant && ast.consequent.constant && ast.alternate.constant;
			ast.toWatch = [ast];
			break;
	}
}

/**
 * 获取表达式输入
 * @param ast
 * @returns {Array|[*]|*|Array.<T>}
 */
function getInputs(ast) {
	if (ast.length !== 1) {
		return;
	}
	const candidate = ast[0].toWatch;
	if (candidate.length !== 1 || candidate[0] !== ast[0]) {
		return candidate;
	}
}

function isAssignable(ast) {
	return ast.type === AST.Identifier || ast.type === AST.MemberExpression;
}
function assignableAST(ast) {
	if (ast.body.length === 1 && isAssignable(ast.body[0])) {
		return {
			type: AST.AssignmentExpression,
			left: ast.body[0],
			right: {type: AST.NGValueParameter}
		};
	}
}

export default class ASTCompiler {

	constructor(astBuilder, $filter) {
		this.astBuilder = astBuilder;
		this.$filter = $filter;
		this.stringEscapeRegex = /[^ a-zA-Z0-9]/g;
	}

	/**
	 * 编译为javaScript表达式
	 * @param text
	 * @returns {*}
	 */
	compile(text) {
		const ast = this.astBuilder.ast(text);
		let extra = '';
		markConstantAndWatchExpressions(ast, this.$filter);
		this.state = {
			fn: {body: [], vars: []},
			nextId: 0,
			filters: {},
			assign: {body: [], vars: []},
			inputs: []
		};
		// 标记是input函数还是主表达式
		this.stage = 'inputs';
		// 循环每个输入表达式
		_.forEach(getInputs(ast.body), _.bind((input, idx) => {
			let inputKey = 'fn' + idx;
			this.state[inputKey] = {body: [], vars: []};
			this.state.computing = inputKey;
			this.state[inputKey].body.push('return ' + this.recurse(input) + ';');
			this.state.inputs.push(inputKey);
		}, this));
		this.stage = 'assign';

		const assignable = assignableAST(ast);
		if (assignable) {
			this.state.computing = 'assign';
			this.state.assign.body.push(this.recurse(assignable));
			extra = 'fn.assign = function(s,v,l){' +
				(this.state.assign.vars.length ? 'var ' + this.state.assign.vars.join(',') + ';' : '') + this.state.assign.body.join('') + '};';
		}

		this.stage = 'main';
		this.state.computing = 'fn';
		this.recurse(ast);
		const fnString = this.filterPrefix() + 'var fn=function(s,l){' +
			(this.state.fn.vars.length ? 'var ' + this.state.fn.vars.join(',') + ';' : '') +
			this.state.fn.body.join('') + '};' +
			this.watchFns() +
			extra +
			' return fn;';
		const fn = new Function(
				'ensureSafeMemberName',
				'ensureSafeObject',
				'ensureSafeFunction',
				'ifDefined',
				'filter',
				fnString)(
				ensureSafeMemberName,
				ensureSafeObject,
				ensureSafeFunction,
				ifDefined,
				this.$filter
			);
		fn.literal = isLiteral(ast);
		fn.constant = ast.constant;
		return fn;
	}

	/**
	 * 判断类型处理
	 * @param ast
	 * @returns {*}
	 */
	recurse(ast, context, create) {
		switch (ast.type) {
			case AST.Program:
				_.forEach(_.initial(ast.body), _.bind(stmt => {
					this.state[this.state.computing].body.push(this.recurse(stmt), ';');
				}, this));
				this.state[this.state.computing].body.push('return ', this.recurse(_.last(ast.body)), ';');
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
				let localsCheck;
				if (this.stage === 'inputs') {
					localsCheck = 'false';
				} else {
					localsCheck = this.getHasOwnProperty('l', ast.name);
				}
				this.if_(localsCheck, this.assign(intoId, this.nonComputedMember('l', ast.name)));
				if (create) {
					this.if_(this.not(localsCheck) + ' && s && ' + this.not(this.getHasOwnProperty('s', ast.name)), this.assign(this.nonComputedMember('s', ast.name), '{}'));
				}
				this.if_(this.not(localsCheck) + ' && s', this.assign(intoId, this.nonComputedMember('s', ast.name)));
				if (context) {
					context.context = localsCheck + '?l:s';
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
				let callContext, callee, args;
				// 如果是filter表达式
				if (ast.filter) {
					callee = this.filter(ast.callee.name);
					args = _.map(ast.arguments, _.bind(arg => {
						return this.recurse(arg);
					}, this));
					return callee + '(' + args + ')';
				} else {
					callContext = {};
					callee = this.recurse(ast.callee, callContext);
					args = _.map(ast.arguments, _.bind(arg => {
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
				}
				break;
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
			case AST.UnaryExpression:
				return ast.operator + '(' + this.ifDefined(this.recurse(ast.argument), 0) + ')';
			case AST.BinaryExpression:
				if (ast.operator === '+' || ast.operator === '-') {
					return '(' + this.ifDefined(this.recurse(ast.left), 0) + ')' + ast.operator + '(' + this.ifDefined(this.recurse(ast.right), 0) + ')';
				} else {
					return '(' + this.recurse(ast.left) + ')' + ast.operator + '(' + this.recurse(ast.right) + ')';
				}
				break;
			case AST.LogicalExpression:
				intoId = this.nextId();
				this.state[this.state.computing].body.push(this.assign(intoId, this.recurse(ast.left)));
				this.if_(ast.operator === '&&' ? intoId : this.not(intoId), this.assign(intoId, this.recurse(ast.right)));
				return intoId;
			case AST.ConditionalExpression:
				intoId = this.nextId();
				const testId = this.nextId();
				this.state[this.state.computing].body.push(this.assign(testId, this.recurse(ast.test)));
				this.if_(testId, this.assign(intoId, this.recurse(ast.consequent)));
				this.if_(this.not(testId), this.assign(intoId, this.recurse(ast.alternate)));
				return intoId;
			case AST.NGValueParameter:
				return 'v';
		}
		let intoId;
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
		this.state[this.state.computing].body.push('if(', test, '){', consequent, '}');
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
	 * @param skip 如果为true的时候就为filter生成，这个时候不需要将生成的id放到state.vars中
	 * @returns {string}
	 */
	nextId(skip) {
		const id = 'v' + (this.state.nextId++);
		if (!skip) {
			this.state[this.state.computing].vars.push(id);
		}
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
		this.state[this.state.computing].body.push('ensureSafeMemberName(' + expr + ');');
	}

	/**
	 * 添加安全的对象
	 * @param expr
	 */
	addEnsureSafeObject(expr) {
		this.state[this.state.computing].body.push('ensureSafeObject(' + expr + ');');
	}

	/**
	 * 添加安全函数
	 * @param expr
	 */
	addEnsureSafeFunction(expr) {
		this.state[this.state.computing].body.push('ensureSafeFunction(' + expr + ');');
	}

	/**
	 *
	 * @param value
	 * @param defaultValue
	 */
	ifDefined(value, defaultValue) {
		return 'ifDefined(' + value + ',' + this.escape(defaultValue) + ')';
	}

	/**
	 * 过滤器
	 * @param name  过滤器名称
	 * @returns {string}
	 */
	filter(name) {
		// 判断过滤器之前是否已经被使用过
		if (!this.state.filters.hasOwnProperty(name)) {
			// filter没有被使用的话，调用的时候存储filter信息到state对象
			this.state.filters[name] = this.nextId(true);
		}
		return this.state.filters[name];
	}

	/**
	 * filter前缀
	 * @returns {string}
	 */
	filterPrefix() {
		// 如果表达式没有使用filter则返回空字符串
		if (_.isEmpty(this.state.filters)) {
			return '';
		} else {
			const parts = _.map(this.state.filters, _.bind((varName, filterName) => {
				return varName + '=' + 'filter(' + this.escape(filterName) + ')';
			}, this));
			return 'var ' + parts.join(',') + ';';
		}
	}

	/**
	 *
	 * @returns {string}
	 */
	watchFns() {
		const result = [];
		_.forEach(this.state.inputs, _.bind(inputName => {
			result.push('var ', inputName, '=function(s) {',
				(this.state[inputName].vars.length ? 'var ' + this.state[inputName].vars.join(',') + ';' : ''),
				this.state[inputName].body.join(''),
				'};');
		}, this));
		if (result.length) {
			result.push('fn.inputs = [', this.state.inputs.join(','), '];');
		}
		return result.join('');
	};
};
