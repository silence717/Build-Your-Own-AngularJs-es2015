/**
 * @author  https://github.com/silence717
 * @date on 2017/1/4
 */
import _ from 'lodash';
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
/**
 * 常量watch代理实现
 * @param scope  作用域
 * @param listenerFn  监听函数
 * @param valueEq  是否做恒等比较
 * @param watchFn  监控函数
 * @returns {*}
 */
function constantWatchDelegate(scope, listenerFn, valueEq, watchFn) {
	const unwatch = scope.$watch(
		() => {
			return watchFn(scope);
		},
		(newValue, oldValue, scope) => {
			if (_.isFunction(listenerFn)) {
				listenerFn.apply(this, arguments);
			}
			unwatch();
		},
		valueEq
	);
	return unwatch;
}
/**
 * 单次watch代理
 * @param scope
 * @param listenerFn
 * @param valueEq
 * @param watchFn
 * @returns {*}
 */
function oneTimeWatchDelegate(scope, listenerFn, valueEq, watchFn) {
	let lastValue;
	const unwatch = scope.$watch(
		() => {
			return watchFn(scope);
		},
		(newValue, oldValue, scope) => {
			lastValue = newValue;
			if (_.isFunction(listenerFn)) {
				listenerFn.apply(this, arguments);
			}
			if (!_.isUndefined(newValue)) {
				scope.$$postDigest(function () {
					if (!_.isUndefined(lastValue)) {
						unwatch();
					}
				});
			}
		}, valueEq
	);
	return unwatch;
}
/**
 * 单次绑定处理集合情况
 * @param scope
 * @param listenerFn
 * @param valueEq
 * @param watchFn
 * @returns {*}
 */
function oneTimeLiteralWatchDelegate(scope, listenerFn, valueEq, watchFn) {
	function isAllDefined(val) {
		// 原书的_.any已经不存在，换为_.some
		return !_.some(val, _.isUndefined);
	}
	const unwatch = scope.$watch(
		() => {
			return watchFn(scope);
		},
		(newValue, oldValue, scope) => {
			if (_.isFunction(listenerFn)) {
				listenerFn.apply(this, arguments);
			}
			if (isAllDefined(newValue)) {
				scope.$$postDigest(() => {
					if (isAllDefined(newValue)) {
						unwatch();
					}
				});
			}
		}, valueEq
	);
	return unwatch;
}

function parse(expr) {
	switch (typeof expr) {
		case 'string':
			const lexer = new Lexer();
			const parser = new Parser(lexer);
			let oneTime = false;
			// 如果表达式的前两个字符均为冒号，我们认为它是单次绑定表达式
			if (expr.charAt(0) === ':' && expr.charAt(1) === ':') {
				oneTime = true;
				expr = expr.substring(2);
			}
			const parseFn = parser.parse(expr);
			if (parseFn.constant) {
				parseFn.$$watchDelegate = constantWatchDelegate;
			} else if (oneTime) {
				parseFn.$$watchDelegate = parseFn.literal ? oneTimeLiteralWatchDelegate : oneTimeWatchDelegate;
			}
			return parseFn;
		case 'function':
			return expr;
		default:
			return _.noop;
	}
}
module.exports = parse;
